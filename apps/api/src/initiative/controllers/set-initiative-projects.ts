import { eq } from "drizzle-orm";
import db from "../../database";
import { initiativeProjectTable } from "../../database/schema";
import getInitiative from "./get-initiative";
import { assertProjectsInWorkspace } from "./validate-links";

async function setInitiativeProjects(
  id: string,
  workspaceId: string,
  requestedProjectIds: string[],
) {
  const projectIds = await assertProjectsInWorkspace(
    workspaceId,
    requestedProjectIds,
  );

  await db.transaction(async (tx) => {
    await tx
      .delete(initiativeProjectTable)
      .where(eq(initiativeProjectTable.initiativeId, id));

    if (projectIds.length > 0) {
      await tx
        .insert(initiativeProjectTable)
        .values(
          projectIds.map((projectId) => ({ initiativeId: id, projectId })),
        );
    }
  });

  return getInitiative(id);
}

export default setInitiativeProjects;
