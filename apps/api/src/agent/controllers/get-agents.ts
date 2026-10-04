import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { agentTable } from "../../database/schema";

async function getAgentsByWorkspace(workspaceId: string) {
  return db
    .select()
    .from(agentTable)
    .where(eq(agentTable.workspaceId, workspaceId))
    .orderBy(asc(agentTable.name));
}

export default getAgentsByWorkspace;
