import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentRunTable } from "../../database/schema";
import { cancelAgentRun } from "../runner/runner";

async function cancelTaskAgentRun(taskId: string) {
  const [active] = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskId, taskId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  if (!active) {
    throw new HTTPException(404, {
      message: "No active agent run for this task",
    });
  }

  const cancelled = await cancelAgentRun(active.id);
  if (!cancelled) {
    throw new HTTPException(500, {
      message: "Failed to cancel agent run",
    });
  }
  return cancelled;
}

export default cancelTaskAgentRun;
