import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { AgentActor } from "../../agent/actor";
import db from "../../database";
import { taskTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function updateTaskPriority({
  id,
  priority,
  currentUserId,
  agent,
}: {
  id: string;
  priority: string;
  currentUserId: string | null;
  agent?: AgentActor;
}) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  const [updatedTask] = await db
    .update(taskTable)
    .set({ priority })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task priority",
    });
  }

  await publishEvent("task.priority_changed", {
    taskId: updatedTask.id,
    projectId: updatedTask.projectId,
    userId: currentUserId,
    agent,
    oldPriority: existingTask.priority,
    newPriority: priority,
    title: updatedTask.title,
    type: "priority_changed",
  });

  return updatedTask;
}

export default updateTaskPriority;
