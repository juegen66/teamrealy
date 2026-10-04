import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable } from "../../database/schema";
import { cancelActiveRunForAgent } from "./cancel-active-run-for-agent";

async function deleteAgent(id: string) {
  const [agent] = await db
    .select({ id: agentTable.id })
    .from(agentTable)
    .where(eq(agentTable.id, id))
    .limit(1);

  if (!agent) {
    throw new HTTPException(404, {
      message: "Agent not found",
    });
  }

  // Stop any in-flight work before the row goes away. Historical runs and
  // activities keep their agentName snapshots; their agentId is nulled by the
  // ON DELETE SET NULL foreign keys.
  await cancelActiveRunForAgent(id);

  const [deleted] = await db
    .delete(agentTable)
    .where(eq(agentTable.id, id))
    .returning();

  if (!deleted) {
    throw new HTTPException(500, {
      message: "Failed to delete agent",
    });
  }

  return deleted;
}

export default deleteAgent;
