import { createTool } from "@mastra/core/tools";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import createComment from "../../activity/controllers/create-comment";
import assignLabelToTask from "../../label/controllers/assign-label-to-task";
import unassignLabelFromTask from "../../label/controllers/unassign-label-from-task";
import createTask from "../../task/controllers/create-task";
import updateTaskDescription from "../../task/controllers/update-task-description";
import updateTaskPriority from "../../task/controllers/update-task-priority";
import updateTaskStatus from "../../task/controllers/update-task-status";
import createTaskRelation from "../../task-relation/controllers/create-task-relation";
import { buildRunContext } from "./context";

export type RunToolContext = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  initiatorId: string;
  agent: { id: string | null; name: string };
  state: { commentWritten: boolean };
};

function toolError(error: unknown): string {
  if (error instanceof HTTPException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown tool error";
}

export function buildAgentTools(ctx: RunToolContext) {
  return {
    getTaskContext: createTool({
      id: "getTaskContext",
      description:
        "Get the current state of the Kaneo task you are working on, including status, description, labels, subtasks, and recent comments.",
      inputSchema: z.object({}),
      execute: async () => {
        return { context: await buildRunContext(ctx.taskId, "assigned") };
      },
    }),
    createComment: createTool({
      id: "createComment",
      description:
        "Post a comment on the current task. Use this to report progress or ask a question. Comments are visible to the assignee and all workspace members.",
      inputSchema: z.object({
        content: z
          .string()
          .describe("The comment body, written for a human reader."),
      }),
      execute: async ({ content }) => {
        ctx.state.commentWritten = true;
        try {
          await createComment(ctx.taskId, ctx.initiatorId, content, undefined, {
            id: ctx.agent.id ?? undefined,
            name: ctx.agent.name,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    createSubtask: createTool({
      id: "createSubtask",
      description:
        "Create a subtask in the same project and link it to the current task as a sub-task.",
      inputSchema: z.object({
        title: z.string().describe("The subtask title."),
        status: z
          .string()
          .optional()
          .describe("Optional column slug, e.g. to-do. Defaults to to-do."),
      }),
      execute: async ({ title, status }) => {
        try {
          const task = await createTask({
            projectId: ctx.projectId,
            currentUserId: ctx.initiatorId,
            title,
            status: status ?? "to-do",
          });
          await createTaskRelation({
            sourceTaskId: ctx.taskId,
            targetTaskId: task.id,
            relationType: "subtask",
            userId: ctx.initiatorId,
            workspaceId: ctx.workspaceId,
          });
          return { ok: true, taskId: task.id };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    updateDescription: createTool({
      id: "updateDescription",
      description:
        "Replace the description of the current task. Use this to record decisions, context, or a summary of the work done.",
      inputSchema: z.object({
        description: z
          .string()
          .describe("The new full description for the task."),
      }),
      execute: async ({ description }) => {
        try {
          await updateTaskDescription({
            id: ctx.taskId,
            description,
            currentUserId: ctx.initiatorId,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    updateStatus: createTool({
      id: "updateStatus",
      description:
        "Move the current task to another column. Use a status slug from the task context (e.g. in-progress, in-review, done).",
      inputSchema: z.object({
        status: z.string().describe("The target column slug."),
      }),
      execute: async ({ status }) => {
        try {
          await updateTaskStatus({
            id: ctx.taskId,
            status,
            currentUserId: ctx.initiatorId,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    updatePriority: createTool({
      id: "updatePriority",
      description:
        "Set the priority of the current task. One of: no-priority, low, medium, high, urgent.",
      inputSchema: z.object({
        priority: z
          .enum(["no-priority", "low", "medium", "high", "urgent"])
          .describe("The new priority."),
      }),
      execute: async ({ priority }) => {
        try {
          await updateTaskPriority({
            id: ctx.taskId,
            priority,
            currentUserId: ctx.initiatorId,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    attachLabel: createTool({
      id: "attachLabel",
      description:
        "Attach an existing workspace label to the current task. Use a label id from the task context's workspace labels list.",
      inputSchema: z.object({
        labelId: z
          .string()
          .describe("The id of the workspace label to attach."),
      }),
      execute: async ({ labelId }) => {
        try {
          await assignLabelToTask(labelId, ctx.taskId, ctx.initiatorId);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
    detachLabel: createTool({
      id: "detachLabel",
      description:
        "Detach a label currently on the current task. Use a label id from the task context's labels list.",
      inputSchema: z.object({
        labelId: z.string().describe("The id of the label to detach."),
      }),
      execute: async ({ labelId }) => {
        try {
          await unassignLabelFromTask(labelId, ctx.initiatorId);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toolError(error) };
        }
      },
    }),
  };
}
