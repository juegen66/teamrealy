import { eq } from "drizzle-orm";
import { initiativeTable } from "../../database/schema";
import { loadInitiatives } from "./load-initiatives";

function getInitiatives(workspaceId: string) {
  return loadInitiatives(eq(initiativeTable.workspaceId, workspaceId));
}

export default getInitiatives;
