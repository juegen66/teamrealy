import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeLinkTable } from "../../database/schema";
import getInitiative from "./get-initiative";

async function deleteInitiativeLink(initiativeId: string, linkId: string) {
  const [deleted] = await db
    .delete(initiativeLinkTable)
    .where(
      and(
        eq(initiativeLinkTable.id, linkId),
        eq(initiativeLinkTable.initiativeId, initiativeId),
      ),
    )
    .returning({ id: initiativeLinkTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Link not found" });
  }

  return getInitiative(initiativeId);
}

export default deleteInitiativeLink;
