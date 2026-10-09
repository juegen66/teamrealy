import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const agentIdParam = z.object({ id: z.string() });

export const taskIdParam = z.object({ taskId: z.string() });

const scheduleField = z.string().nullable().optional().openapi({
  description:
    "5-field cron expression for scheduled runs, for example 0 9 * * 1-5. Null or an empty string clears it; omit to leave it unchanged on update.",
});

const scheduleTimezoneField = z.string().nullable().optional().openapi({
  description:
    "IANA timezone name the schedule is evaluated in, for example Europe/Berlin. Null or an empty string means UTC; omit to leave it unchanged on update.",
});

export const createAgentBody = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional(),
  schedule: scheduleField,
  scheduleTimezone: scheduleTimezoneField,
});

export const updateAgentBody = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional(),
  schedule: scheduleField,
  scheduleTimezone: scheduleTimezoneField,
});

export const assignAgentBody = z.object({
  agentId: z.string().nullable(),
});
