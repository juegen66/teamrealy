import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  activityTable,
  labelTable,
  taskRelationTable,
  taskTable,
  userTable,
} from "../../database/schema";

export type RunContext = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeName: string | null;
  labels: Array<{ id: string; name: string }>;
  workspaceLabels: Array<{ id: string; name: string }>;
  subtasks: Array<{ id: string; title: string }>;
  recentComments: Array<{
    userName: string | null;
    content: string;
    createdAt: Date;
  }>;
  userMessage: string;
};

function formatComment(comment: {
  userName: string | null;
  content: string | null;
  createdAt: Date;
}) {
  const name = comment.userName ?? "Unknown";
  const text = (comment.content ?? "").replace(/<[^>]*>/g, "").slice(0, 500);
  return `- ${comment.createdAt.toISOString()} ${name}: ${text}`;
}

export async function buildRunContext(
  taskId: string,
  trigger: string,
): Promise<RunContext> {
  const [task] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      title: taskTable.title,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      userId: taskTable.userId,
      workspaceId: sql<string>`${taskTable.projectId}`,
      assigneeName: userTable.name,
    })
    .from(taskTable)
    .leftJoin(userTable, eq(taskTable.userId, userTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const taskLabels = await db
    .select({ id: labelTable.id, name: labelTable.name })
    .from(labelTable)
    .where(eq(labelTable.taskId, taskId))
    .orderBy(asc(labelTable.name));

  const subtasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
    })
    .from(taskRelationTable)
    .innerJoin(taskTable, eq(taskRelationTable.targetTaskId, taskTable.id))
    .where(
      and(
        eq(taskRelationTable.sourceTaskId, taskId),
        eq(taskRelationTable.relationType, "subtask"),
      ),
    )
    .orderBy(asc(taskTable.createdAt));

  const recentComments = await db
    .select({
      userName: userTable.name,
      content: activityTable.content,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .leftJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(
      and(
        eq(activityTable.taskId, taskId),
        eq(activityTable.type, "comment"),
        isNotNull(activityTable.content),
      ),
    )
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  const workspaceId = (
    await db.query.projectTable.findFirst({
      columns: { workspaceId: true },
      where: (project, { eq: eqOp }) => eqOp(project.id, task.projectId),
    })
  )?.workspaceId;

  const workspaceLabels = workspaceId
    ? await db
        .select({ id: labelTable.id, name: labelTable.name })
        .from(labelTable)
        .where(
          and(
            eq(labelTable.workspaceId, workspaceId),
            sql`${labelTable.taskId} is null`,
          ),
        )
        .orderBy(asc(labelTable.name))
    : [];

  const triggeringComment =
    trigger === "comment" ? recentComments[0] : undefined;

  const lines = [
    `Task: "${task.title}"`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    task.dueDate ? `Due date: ${task.dueDate.toISOString()}` : "Due date: none",
    task.description
      ? `Description:\n${task.description}`
      : "Description: none",
    `Assignee: ${task.assigneeName ?? "none"}`,
    `Labels: ${taskLabels.map((label) => label.name).join(", ") || "none"}`,
    `Subtasks: ${subtasks.map((subtask) => subtask.title).join(", ") || "none"}`,
  ];

  if (workspaceLabels.length > 0) {
    lines.push(
      `Workspace labels available to attach (use their ids): ${workspaceLabels
        .map((label) => `${label.name} (${label.id})`)
        .join(", ")}`,
    );
  }

  if (recentComments.length > 0) {
    lines.push(
      `Recent comments:\n${recentComments
        .slice(0, 10)
        .map(formatComment)
        .join("\n")}`,
    );
  }

  if (triggeringComment?.content) {
    lines.push(
      `\nA new comment was posted on this task. Read it and respond or take the requested action:\n${formatComment(triggeringComment)}`,
    );
  } else {
    lines.push(
      "\nWork on this task. Use the available tools to comment, create subtasks, or update fields. If you finish with a message, post it as a comment.",
    );
  }

  return {
    taskId,
    projectId: task.projectId,
    workspaceId: workspaceId ?? "",
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    assigneeName: task.assigneeName,
    labels: taskLabels,
    workspaceLabels,
    subtasks,
    recentComments: recentComments.map((comment) => ({
      userName: comment.userName,
      content: comment.content ?? "",
      createdAt: comment.createdAt,
    })),
    userMessage: lines.join("\n"),
  };
}
