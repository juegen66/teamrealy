import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { initiativeTable } from "../../database/schema";
import { loadInitiatives } from "./load-initiatives";

async function getInitiative(id: string) {
  const [initiative] = await loadInitiatives(eq(initiativeTable.id, id));

  if (!initiative) {
    throw new HTTPException(404, { message: "Initiative not found" });
  }

  return initiative;
}

export default getInitiative;
