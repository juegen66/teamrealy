import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeTable } from "../../database/schema";
import getInitiative from "./get-initiative";
import { assertOwnerInWorkspace } from "./validate-links";

type UpdateInitiativeInput = {
  name?: string;
  summary?: string | null;
  description?: string | null;
  icon?: string;
  color?: string | null;
  status?: string;
  priority?: string;
  ownerId?: string | null;
  targetDate?: string | null;
};

async function updateInitiative(
  id: string,
  workspaceId: string,
  input: UpdateInitiativeInput,
) {
  const name = input.name?.trim();
  if (input.name !== undefined && !name) {
    throw new HTTPException(400, { message: "Name is required" });
  }

  await assertOwnerInWorkspace(workspaceId, input.ownerId);

  const values = {
    ...(name ? { name } : {}),
    ...(input.summary !== undefined
      ? { summary: input.summary?.trim() || null }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description?.trim() || null }
      : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
    ...(input.targetDate !== undefined
      ? { targetDate: input.targetDate ? new Date(input.targetDate) : null }
      : {}),
  };

  if (Object.keys(values).length > 0) {
    const [updated] = await db
      .update(initiativeTable)
      .set(values)
      .where(eq(initiativeTable.id, id))
      .returning({ id: initiativeTable.id });

    if (!updated) {
      throw new HTTPException(404, { message: "Initiative not found" });
    }
  }

  return getInitiative(id);
}

export default updateInitiative;
