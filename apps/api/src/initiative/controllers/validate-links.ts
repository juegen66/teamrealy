import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, workspaceUserTable } from "../../database/schema";

export async function assertProjectsInWorkspace(
  workspaceId: string,
  projectIds: string[],
) {
  const unique = [...new Set(projectIds)];
  if (unique.length === 0) return unique;

  const rows = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        inArray(projectTable.id, unique),
      ),
    );

  if (rows.length !== unique.length) {
    throw new HTTPException(400, {
      message: "All projects must belong to the initiative's workspace",
    });
  }

  return unique;
}

export async function assertOwnerInWorkspace(
  workspaceId: string,
  ownerId: string | null | undefined,
) {
  if (!ownerId) return;

  const [member] = await db
    .select({ userId: workspaceUserTable.userId })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userId, ownerId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new HTTPException(400, {
      message: "Owner must be a member of the workspace",
    });
  }
}
