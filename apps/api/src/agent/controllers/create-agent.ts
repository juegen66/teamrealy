import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { agentTable } from "../../database/schema";
import { normalizeSchedule, normalizeScheduleTimezone } from "../schedule";

async function createAgent({
  workspaceId,
  name,
  instructions,
  model,
  schedule,
  scheduleTimezone,
}: {
  workspaceId: string;
  name: string;
  instructions: string;
  model?: string;
  schedule?: string | null;
  scheduleTimezone?: string | null;
}) {
  const trimmedName = name.trim();
  const trimmedInstructions = instructions.trim();
  if (!trimmedName || !trimmedInstructions) {
    throw new HTTPException(400, {
      message: "Name and instructions are required",
    });
  }

  const timezone = normalizeScheduleTimezone(scheduleTimezone) ?? null;
  const cron = normalizeSchedule(schedule, timezone) ?? null;

  const [agent] = await db
    .insert(agentTable)
    .values({
      workspaceId,
      name: trimmedName,
      instructions: trimmedInstructions,
      model: model?.trim() || null,
      schedule: cron,
      scheduleTimezone: timezone,
    })
    .returning();

  if (!agent) {
    throw new HTTPException(500, {
      message: "Failed to create agent",
    });
  }

  return agent;
}

export default createAgent;
