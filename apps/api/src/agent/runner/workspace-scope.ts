import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  labelTable,
  projectTable,
  taskTable,
  workspaceUserTable,
} from "../../database/schema";

// Every id an agent tool receives comes from model output, so each one is
// checked against the run's workspace before anything acts on it. Keep all
// such checks here rather than in individual tools.

function requireWorkspace(workspaceId: string) {
  if (!workspaceId) {
    throw new HTTPException(403, { message: "Run has no workspace scope" });
  }
}

export async function assertProjectInWorkspace(
  projectId: string,
  workspaceId: string,
) {
  requireWorkspace(workspaceId);
  const [project] = await db
    .select({ id: projectTable.id, name: projectTable.name })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(projectTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found in this workspace",
    });
  }
  return project;
}

export async function assertTaskInWorkspace(
  taskId: string,
  workspaceId: string,
) {
  requireWorkspace(workspaceId);
  const [task] = await db
    .select({ id: taskTable.id, projectId: taskTable.projectId })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(eq(taskTable.id, taskId), eq(projectTable.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!task) {
    throw new HTTPException(404, {
      message: "Task not found in this workspace",
    });
  }
  return task;
}

export async function assertMemberInWorkspace(
  userId: string,
  workspaceId: string,
) {
  requireWorkspace(workspaceId);
  const [member] = await db
    .select({ userId: workspaceUserTable.userId })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new HTTPException(404, {
      message: "User is not a member of this workspace",
    });
  }
  return member;
}

// unassignLabelFromTask only looks the label up by id, so the detach tool
// confirms the label sits on the run's own task first.
export async function assertLabelOnTask(labelId: string, taskId: string) {
  const [label] = await db
    .select({ id: labelTable.id })
    .from(labelTable)
    .where(and(eq(labelTable.id, labelId), eq(labelTable.taskId, taskId)))
    .limit(1);

  if (!label) {
    throw new HTTPException(404, {
      message: "Label is not attached to this task",
    });
  }
  return label;
}
