import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { cancelActiveRunForTask, createAndStartRun } from "../runner/runner";

async function assignAgentToTask({
  taskId,
  agentId,
  currentUserId,
  workspaceId,
}: {
  taskId: string;
  agentId: string | null;
  currentUserId: string;
  workspaceId: string;
}) {
  const [task] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      agentId: taskTable.agentId,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const normalizedAgentId = agentId?.trim() || null;

  // Unassigning: cancel any active run and clear the assignment.
  if (!normalizedAgentId) {
    if (!task.agentId) {
      return await getTaskRow(taskId);
    }

    const [agentRow] = await db
      .select({ name: agentTable.name })
      .from(agentTable)
      .where(eq(agentTable.id, task.agentId))
      .limit(1);

    await cancelActiveRunForTask(taskId);

    await db
      .update(taskTable)
      .set({ agentId: null })
      .where(eq(taskTable.id, taskId));

    await publishEvent("agent.unassigned", {
      taskId,
      projectId: task.projectId,
      userId: currentUserId,
      agentId: task.agentId,
      agentName: agentRow?.name ?? null,
      type: "agent_unassigned",
    });

    return await getTaskRow(taskId);
  }

  // Assigning the same agent again is a no-op; use rerun to start a new run.
  if (task.agentId === normalizedAgentId) {
    return await getTaskRow(taskId);
  }

  const [agentRow] = await db
    .select({ id: agentTable.id, name: agentTable.name })
    .from(agentTable)
    .where(
      and(
        eq(agentTable.id, normalizedAgentId),
        eq(agentTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!agentRow) {
    throw new HTTPException(404, { message: "Agent not found" });
  }

  // Replacing an agent cancels the previous agent's active run first.
  if (task.agentId) {
    await cancelActiveRunForTask(taskId);
  }

  await db
    .update(taskTable)
    .set({ agentId: normalizedAgentId })
    .where(eq(taskTable.id, taskId));

  await publishEvent("agent.assigned", {
    taskId,
    projectId: task.projectId,
    userId: currentUserId,
    agentId: normalizedAgentId,
    agentName: agentRow.name,
    type: "agent_assigned",
  });

  await createAndStartRun({
    taskId,
    agentId: normalizedAgentId,
    agentName: agentRow.name,
    initiatorId: currentUserId,
    trigger: "assigned",
  });

  return await getTaskRow(taskId);
}

async function getTaskRow(taskId: string) {
  const [task] = await db.query.taskTable.findMany({
    where: eq(taskTable.id, taskId),
    limit: 1,
  });

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  return task;
}

export default assignAgentToTask;
