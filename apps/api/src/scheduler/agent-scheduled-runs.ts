import { and, eq, gte, isNotNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { hasAi } from "../agent/config";
import { createAndStartRun } from "../agent/runner/runner";
import { createScheduleCron } from "../agent/schedule";
import db from "../database";
import { agentRunTable, agentTable } from "../database/schema";
import { withJobLease } from "./leader-lock";

export const AGENT_SCHEDULED_RUNS_LEASE = "agent-scheduled-runs";

const LEASE_MS = 60 * 1000;

function isDue(
  schedule: string,
  timezone: string | null,
  minute: Date,
): boolean {
  return createScheduleCron(schedule, timezone).match(minute);
}

async function runDueAgents(): Promise<{ degraded: boolean }> {
  // Cron patterns carry second 0, so match against the start of the minute.
  const minute = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  let degraded = false;

  const agents = await db
    .select({
      id: agentTable.id,
      name: agentTable.name,
      schedule: agentTable.schedule,
      scheduleTimezone: agentTable.scheduleTimezone,
    })
    .from(agentTable)
    .where(isNotNull(agentTable.schedule));

  for (const agent of agents) {
    try {
      if (
        !agent.schedule ||
        !isDue(agent.schedule, agent.scheduleTimezone, minute)
      ) {
        continue;
      }

      // The lease is released when this tick finishes, so another instance
      // ticking later in the same minute would otherwise claim it again.
      const [alreadyStarted] = await db
        .select({ id: agentRunTable.id })
        .from(agentRunTable)
        .where(
          and(
            eq(agentRunTable.agentId, agent.id),
            eq(agentRunTable.trigger, "scheduled"),
            gte(agentRunTable.createdAt, minute),
          ),
        )
        .limit(1);

      if (alreadyStarted) continue;

      await createAndStartRun({
        taskId: null,
        agentId: agent.id,
        agentName: agent.name,
        initiatorId: null,
        trigger: "scheduled",
      });
    } catch (error) {
      // 409 means the previous scheduled run is still active; skip this tick.
      if (error instanceof HTTPException && error.status === 409) continue;
      degraded = true;
      console.error(`Scheduled run failed for agent ${agent.id}`, error);
    }
  }

  return { degraded };
}

export async function runScheduledAgents(): Promise<{ degraded: boolean }> {
  if (!hasAi()) {
    return { degraded: false };
  }

  return withJobLease(
    AGENT_SCHEDULED_RUNS_LEASE,
    runDueAgents,
    () => ({ degraded: false }),
    LEASE_MS,
  );
}
