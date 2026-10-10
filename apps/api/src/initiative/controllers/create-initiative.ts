import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeProjectTable, initiativeTable } from "../../database/schema";
import getInitiative from "./get-initiative";
import {
  assertOwnerInWorkspace,
  assertProjectsInWorkspace,
} from "./validate-links";

async function createInitiative(input: {
  workspaceId: string;
  name: string;
  summary?: string;
  description?: string;
  icon?: string;
  color?: string | null;
  status?: string;
  priority?: string;
  ownerId?: string | null;
  targetDate?: string | null;
  projectIds?: string[];
}) {
  const name = input.name.trim();
  if (!name) {
    throw new HTTPException(400, { message: "Name is required" });
  }

  await assertOwnerInWorkspace(input.workspaceId, input.ownerId);
  const projectIds = await assertProjectsInWorkspace(
    input.workspaceId,
    input.projectIds ?? [],
  );

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(initiativeTable)
      .values({
        workspaceId: input.workspaceId,
        name,
        summary: input.summary?.trim() || null,
        description: input.description?.trim() || null,
        color: input.color ?? null,
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ownerId: input.ownerId ?? null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      })
      .returning({ id: initiativeTable.id });

    if (!created) {
      throw new HTTPException(500, { message: "Failed to create initiative" });
    }

    if (projectIds.length > 0) {
      await tx.insert(initiativeProjectTable).values(
        projectIds.map((projectId) => ({
          initiativeId: created.id,
          projectId,
        })),
      );
    }

    return created.id;
  });

  return getInitiative(id);
}

export default createInitiative;
