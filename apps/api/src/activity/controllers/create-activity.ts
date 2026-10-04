import db from "../../database";
import { activityTable } from "../../database/schema";

async function createActivity(
  taskId: string,
  type: string,
  userId: string | null,
  content: string | null,
  eventData?: Record<string, unknown> | null,
  agent?: { id: string | null; name: string },
) {
  const [activity] = await db
    .insert(activityTable)
    .values({
      taskId,
      type,
      userId,
      content,
      eventData: eventData ?? null,
      ...(agent
        ? {
            agentId: agent.id,
            agentName: agent.name,
          }
        : {}),
    })
    .returning();
  return activity;
}

export default createActivity;
