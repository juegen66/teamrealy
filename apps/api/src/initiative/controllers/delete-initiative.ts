import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeTable } from "../../database/schema";

async function deleteInitiative(id: string) {
  const [deleted] = await db
    .delete(initiativeTable)
    .where(eq(initiativeTable.id, id))
    .returning();

  if (!deleted) {
    throw new HTTPException(404, { message: "Initiative not found" });
  }

  return deleted;
}

export default deleteInitiative;
