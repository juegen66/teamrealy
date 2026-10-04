import { eq } from "drizzle-orm";
import db from "../../database";
import { agentTable, taskTable } from "../../database/schema";
import { hasAi } from "../config";
import { createAndStartRun, getActiveRunForTask } from "./runner";

// A human comment on a task with an assigned agent starts a new run, but only
// when AI is on and the task has no active run. Agent comments, edits, and
// imported comments never reach this function (createComment skips it for them).
export async function maybeStartCommentRun(taskId: string, userId: string) {
  if (!hasAi()) return;

  const [task] = await db
    .select({ id: taskTable.id, agentId: taskTable.agentId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task?.agentId) return;
  if (await getActiveRunForTask(taskId)) return;

  const [agentRow] = await db
    .select({ id: agentTable.id, name: agentTable.name })
    .from(agentTable)
    .where(eq(agentTable.id, task.agentId))
    .limit(1);

  if (!agentRow) return;

  await createAndStartRun({
    taskId,
    agentId: agentRow.id,
    agentName: agentRow.name,
    initiatorId: userId,
    trigger: "comment",
  });
}
