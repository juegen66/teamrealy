import { createTool } from "@mastra/core/tools";
import { and, asc, desc, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import createComment from "../../activity/controllers/create-comment";
import db from "../../database";
import {
  labelTable,
  projectTable,
  taskTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import { escapeLikePattern } from "../../search/like-pattern";
import createTask from "../../task/controllers/create-task";
import updateTaskAssignee from "../../task/controllers/update-task-assignee";
import { actorFor, type RunToolContext, toolError } from "./tool-context";
import {
  assertMemberInWorkspace,
  assertProjectInWorkspace,
  assertTaskInWorkspace,
} from "./workspace-scope";

const MAX_SEARCH_RESULTS = 25;
const MAX_LIST_RESULTS = 100;

function parseDueDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("dueDate must be an ISO 8601 date such as 2026-10-31");
  }
  return parsed;
}

export function buildWorkspaceTools(ctx: RunToolContext) {
  return {
    listProjects: createTool({
      id: "listProjects",
      description:
        "List the active projects in this workspace. Use a project id from here when searching or creating tasks.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const projects = await db
            .select({
              id: projectTable.id,
              name: projectTable.name,
              slug: projectTable.slug,
            })
            .from(projectTable)
            .where(
              and(
                eq(projectTable.workspaceId, ctx.workspaceId),
                isNull(projectTable.archivedAt),
              ),
            )
            .orderBy(asc(projectTable.position), asc(projectTable.name))
            .limit(MAX_LIST_RESULTS);
          return { ok: true, projects };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    listMembers: createTool({
      id: "listMembers",
      description:
        "List the members of this workspace (id and name) so you can pick an assignee.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const members = await db
            .select({ id: userTable.id, name: userTable.name })
            .from(workspaceUserTable)
            .innerJoin(userTable, eq(workspaceUserTable.userId, userTable.id))
            .where(eq(workspaceUserTable.workspaceId, ctx.workspaceId))
            .orderBy(asc(userTable.name))
            .limit(MAX_LIST_RESULTS);
          return { ok: true, members };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    searchTasks: createTool({
      id: "searchTasks",
      description: `Search tasks in this workspace by title. Optionally filter by project, status slug, or assignee. Returns at most ${MAX_SEARCH_RESULTS} tasks, newest first.`,
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Text to look for in the task title."),
        projectId: z.string().optional(),
        status: z.string().optional().describe("A column slug, e.g. to-do."),
        assigneeId: z.string().optional().describe("A workspace member id."),
      }),
      execute: async ({ query, projectId, status, assigneeId }) => {
        try {
          if (projectId) {
            await assertProjectInWorkspace(projectId, ctx.workspaceId);
          }
          if (assigneeId) {
            await assertMemberInWorkspace(assigneeId, ctx.workspaceId);
          }

          const trimmed = query?.trim();
          const tasks = await db
            .select({
              id: taskTable.id,
              number: taskTable.number,
              title: taskTable.title,
              status: taskTable.status,
              priority: taskTable.priority,
              projectId: taskTable.projectId,
              assigneeId: taskTable.userId,
            })
            .from(taskTable)
            .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
            .where(
              and(
                eq(projectTable.workspaceId, ctx.workspaceId),
                projectId ? eq(taskTable.projectId, projectId) : undefined,
                status ? eq(taskTable.status, status) : undefined,
                assigneeId ? eq(taskTable.userId, assigneeId) : undefined,
                trimmed
                  ? ilike(taskTable.title, `%${escapeLikePattern(trimmed)}%`)
                  : undefined,
              ),
            )
            .orderBy(desc(taskTable.createdAt))
            .limit(MAX_SEARCH_RESULTS);
          return { ok: true, tasks };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    getTask: createTool({
      id: "getTask",
      description:
        "Get one task in this workspace by id: title, status, priority, assignee, project, description, and labels.",
      inputSchema: z.object({ taskId: z.string() }),
      execute: async ({ taskId }) => {
        try {
          await assertTaskInWorkspace(taskId, ctx.workspaceId);

          const [task] = await db
            .select({
              id: taskTable.id,
              title: taskTable.title,
              status: taskTable.status,
              priority: taskTable.priority,
              description: taskTable.description,
              assigneeId: userTable.id,
              assigneeName: userTable.name,
              projectId: projectTable.id,
              projectName: projectTable.name,
            })
            .from(taskTable)
            .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
            .leftJoin(userTable, eq(taskTable.userId, userTable.id))
            .where(eq(taskTable.id, taskId))
            .limit(1);

          const labels = await db
            .select({ id: labelTable.id, name: labelTable.name })
            .from(labelTable)
            .where(eq(labelTable.taskId, taskId))
            .orderBy(asc(labelTable.name));

          return {
            ok: true,
            task: {
              id: task?.id,
              title: task?.title,
              status: task?.status,
              priority: task?.priority,
              description: task?.description,
              assignee: task?.assigneeId
                ? { id: task.assigneeId, name: task.assigneeName }
                : null,
              project: { id: task?.projectId, name: task?.projectName },
              labels,
            },
          };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    createTask: createTool({
      id: "createTask",
      description:
        "Create a task in a project of this workspace. Optionally set description, status slug, priority, assignee (workspace member id), and due date (ISO 8601).",
      inputSchema: z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.string().optional().describe("A column slug, e.g. to-do."),
        priority: z
          .enum(["no-priority", "low", "medium", "high", "urgent"])
          .optional(),
        assigneeId: z.string().optional().describe("A workspace member id."),
        dueDate: z.string().optional().describe("ISO 8601 date."),
      }),
      execute: async ({
        projectId,
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate,
      }) => {
        try {
          await assertProjectInWorkspace(projectId, ctx.workspaceId);
          if (assigneeId) {
            await assertMemberInWorkspace(assigneeId, ctx.workspaceId);
          }
          const task = await createTask({
            projectId,
            ...actorFor(ctx),
            userId: assigneeId,
            title,
            description,
            status: status ?? "to-do",
            priority,
            dueDate: parseDueDate(dueDate),
          });
          return { ok: true, taskId: task.id };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    assignTask: createTool({
      id: "assignTask",
      description:
        "Assign a task in this workspace to a workspace member, or pass null to unassign it.",
      inputSchema: z.object({
        taskId: z.string(),
        userId: z.string().nullable(),
      }),
      execute: async ({ taskId, userId }) => {
        try {
          await assertTaskInWorkspace(taskId, ctx.workspaceId);
          if (userId) {
            await assertMemberInWorkspace(userId, ctx.workspaceId);
          }
          await updateTaskAssignee({ id: taskId, userId, ...actorFor(ctx) });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    commentOnTask: createTool({
      id: "commentOnTask",
      description:
        "Post a comment on a task in this workspace. Comments are visible to the assignee and all workspace members.",
      inputSchema: z.object({
        taskId: z.string(),
        content: z
          .string()
          .min(1)
          .describe("The comment body, written for a human reader."),
      }),
      execute: async ({ taskId, content }) => {
        try {
          await assertTaskInWorkspace(taskId, ctx.workspaceId);
          if (taskId === ctx.taskId) {
            ctx.state.commentWritten = true;
          }
          await createComment(taskId, ctx.initiatorId, content, undefined, {
            id: ctx.agent.id ?? undefined,
            name: ctx.agent.name,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
  };
}
