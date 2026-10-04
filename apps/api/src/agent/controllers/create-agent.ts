import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable } from "../../database/schema";

async function createAgent({
  workspaceId,
  name,
  instructions,
  model,
}: {
  workspaceId: string;
  name: string;
  instructions: string;
  model?: string;
}) {
  const trimmedName = name.trim();
  const trimmedInstructions = instructions.trim();
  if (!trimmedName || !trimmedInstructions) {
    throw new HTTPException(400, {
      message: "Name and instructions are required",
    });
  }

  const [agent] = await db
    .insert(agentTable)
    .values({
      workspaceId,
      name: trimmedName,
      instructions: trimmedInstructions,
      model: model?.trim() || null,
    })
    .returning();

  if (!agent) {
    throw new HTTPException(500, {
      message: "Failed to create agent",
    });
  }

  return agent;
}

export default createAgent;
