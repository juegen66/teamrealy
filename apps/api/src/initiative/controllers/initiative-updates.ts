import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeUpdateTable, userTable } from "../../database/schema";

const updateSelection = {
  id: initiativeUpdateTable.id,
  initiativeId: initiativeUpdateTable.initiativeId,
  health: initiativeUpdateTable.health,
  body: initiativeUpdateTable.body,
  createdAt: initiativeUpdateTable.createdAt,
  authorId: userTable.id,
  authorName: userTable.name,
  authorImage: userTable.image,
};

function toUpdate(row: {
  id: string;
  initiativeId: string;
  health: string;
  body: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
  authorImage: string | null;
}) {
  const { authorId, authorName, authorImage, ...update } = row;
  return {
    ...update,
    author: authorId
      ? { id: authorId, name: authorName ?? "", image: authorImage }
      : null,
  };
}

export async function listInitiativeUpdates(initiativeId: string) {
  const rows = await db
    .select(updateSelection)
    .from(initiativeUpdateTable)
    .leftJoin(userTable, eq(initiativeUpdateTable.userId, userTable.id))
    .where(eq(initiativeUpdateTable.initiativeId, initiativeId))
    .orderBy(desc(initiativeUpdateTable.createdAt));

  return rows.map(toUpdate);
}

export async function createInitiativeUpdate(
  initiativeId: string,
  userId: string,
  input: { health: string; body: string },
) {
  const body = input.body.trim();
  if (!body) {
    throw new HTTPException(400, { message: "Update body is required" });
  }

  const [created] = await db
    .insert(initiativeUpdateTable)
    .values({ initiativeId, userId, health: input.health, body })
    .returning({ id: initiativeUpdateTable.id });

  if (!created) {
    throw new HTTPException(500, { message: "Failed to create update" });
  }

  const [row] = await db
    .select(updateSelection)
    .from(initiativeUpdateTable)
    .leftJoin(userTable, eq(initiativeUpdateTable.userId, userTable.id))
    .where(eq(initiativeUpdateTable.id, created.id));

  if (!row) {
    throw new HTTPException(500, { message: "Failed to load update" });
  }

  return toUpdate(row);
}
