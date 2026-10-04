import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { activityTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { deleteOrphanedAssets } from "../../storage/cleanup-assets";

async function updateComment(userId: string, id: string, content: string) {
  // Agent-authored comments are immutable; only the initiating user could ever
  // match this query, and they must not rewrite the agent's words. The agentId
  // is SET NULL when the agent row is deleted, so agentName (the snapshot) is
  // the durable marker of an agent-authored comment.
  const authorFilter = and(
    eq(activityTable.id, id),
    eq(activityTable.userId, userId),
    eq(activityTable.type, "comment"),
    isNull(activityTable.agentId),
    isNull(activityTable.agentName),
  );

  const [existing] = await db
    .select({
      id: activityTable.id,
      content: activityTable.content,
      taskId: activityTable.taskId,
    })
    .from(activityTable)
    .where(authorFilter)
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, {
      message: "Comment not found or you are not the author",
    });
  }

  const [updated] = await db
    .update(activityTable)
    .set({ content })
    .where(authorFilter)
    .returning();

  if (!updated) {
    throw new HTTPException(404, {
      message: "Comment not found or you are not the author",
    });
  }

  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, updated.taskId))
    .limit(1);

  if (task) {
    await publishEvent("comment.updated", {
      ...updated,
      projectId: task.projectId,
      userId,
    });
  }

  deleteOrphanedAssets(existing.content, content, {
    taskId: existing.taskId,
  }).catch(() => {});

  return updated;
}

export default updateComment;
