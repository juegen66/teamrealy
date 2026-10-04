import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import { agentRunTable } from "../../database/schema";
import { cancelAgentRun } from "../runner/runner";

export async function cancelActiveRunForAgent(agentId: string) {
  const active = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.agentId, agentId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    );

  for (const run of active) {
    await cancelAgentRun(run.id);
  }
}
