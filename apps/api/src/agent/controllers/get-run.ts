import { desc, eq } from "drizzle-orm";
import db from "../../database";
import { agentRunTable } from "../../database/schema";

async function getTaskAgentRun(taskId: string) {
  const [run] = await db
    .select()
    .from(agentRunTable)
    .where(eq(agentRunTable.taskId, taskId))
    .orderBy(desc(agentRunTable.createdAt))
    .limit(1);

  return run ?? null;
}

export default getTaskAgentRun;
