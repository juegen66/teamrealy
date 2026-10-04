import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable } from "../../database/schema";

async function updateAgent(
  id: string,
  {
    name,
    instructions,
    model,
  }: {
    name: string;
    instructions: string;
    model?: string;
  },
) {
  const [updated] = await db
    .update(agentTable)
    .set({
      name: name.trim(),
      instructions: instructions.trim(),
      ...(model !== undefined ? { model: model.trim() || null } : {}),
    })
    .where(eq(agentTable.id, id))
    .returning();

  if (!updated) {
    throw new HTTPException(404, {
      message: "Agent not found",
    });
  }

  return updated;
}

export default updateAgent;
