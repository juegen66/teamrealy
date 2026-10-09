import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

export const agentSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    instructions: z.string(),
    model: z.string().nullable(),
    schedule: z.string().nullable().openapi({
      description:
        "Cron expression that triggers scheduled runs, or null when the agent is not scheduled",
    }),
    scheduleTimezone: z.string().nullable().openapi({
      description: "IANA timezone the schedule is evaluated in. Null means UTC",
    }),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("Agent");

export const agentListSchema = z.array(agentSchema);

export const agentRunSchema = z
  .object({
    id: z.string(),
    taskId: z.string().nullable(),
    agentId: z.string().nullable(),
    agentName: z.string(),
    initiatorId: z.string().nullable(),
    trigger: z.string().openapi({
      description: "assigned, comment, rerun, or scheduled",
    }),
    status: z.string().openapi({
      description: "queued, running, succeeded, failed, or cancelled",
    }),
    error: z.string().nullable(),
    startedAt: nullableResponseTimestamp,
    finishedAt: nullableResponseTimestamp,
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("AgentRun");

export const agentRunNullableSchema = agentRunSchema.nullable();
