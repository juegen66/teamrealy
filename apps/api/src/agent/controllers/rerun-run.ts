import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable, taskTable } from "../../database/schema";
import { createAndStartRun } from "../runner/runner";

async function rerunTaskAgent({
  taskId,
  currentUserId,
}: {
  taskId: string;
  currentUserId: string;
}) {
  const [task] = await db
    .select({ agentId: taskTable.agentId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  if (!task.agentId) {
    throw new HTTPException(409, {
      message: "No agent is assigned to this task",
    });
  }

  const [agentRow] = await db
    .select({ id: agentTable.id, name: agentTable.name })
    .from(agentTable)
    .where(eq(agentTable.id, task.agentId))
    .limit(1);

  if (!agentRow) {
    throw new HTTPException(404, { message: "Agent not found" });
  }

  return createAndStartRun({
    taskId,
    agentId: agentRow.id,
    agentName: agentRow.name,
    initiatorId: currentUserId,
    trigger: "rerun",
  });
}

export default rerunTaskAgent;
