import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable } from "../../database/schema";
import { normalizeSchedule, normalizeScheduleTimezone } from "../schedule";

async function updateAgent(
  id: string,
  {
    name,
    instructions,
    model,
    schedule,
    scheduleTimezone,
  }: {
    name: string;
    instructions: string;
    model?: string;
    schedule?: string | null;
    scheduleTimezone?: string | null;
  },
) {
  const [existing] = await db
    .select({ scheduleTimezone: agentTable.scheduleTimezone })
    .from(agentTable)
    .where(eq(agentTable.id, id))
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, {
      message: "Agent not found",
    });
  }

  const nextTimezone = normalizeScheduleTimezone(scheduleTimezone);
  // A new cron is validated against the timezone it will run in.
  const nextSchedule = normalizeSchedule(
    schedule,
    nextTimezone === undefined ? existing.scheduleTimezone : nextTimezone,
  );

  const [updated] = await db
    .update(agentTable)
    .set({
      name: name.trim(),
      instructions: instructions.trim(),
      ...(model !== undefined ? { model: model.trim() || null } : {}),
      ...(nextSchedule !== undefined ? { schedule: nextSchedule } : {}),
      ...(nextTimezone !== undefined ? { scheduleTimezone: nextTimezone } : {}),
    })
    .where(eq(agentTable.id, id))
    .returning();

  if (!updated) {
    throw new HTTPException(404, {
      message: "Agent not found",
    });
  }

  return updated;
}

export default updateAgent;
