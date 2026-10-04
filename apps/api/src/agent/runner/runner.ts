import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import createComment from "../../activity/controllers/create-comment";
import db from "../../database";
import {
  agentRunTable,
  agentTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { buildRunContext } from "./context";
import { runMastraAgent } from "./mastra-agent";
import { buildAgentTools } from "./tools";

const RUN_TIMEOUT_MS = 60_000;

const activeRuns = new Map<string, AbortController>();
const cancelledByUser = new Set<string>();

export function isActiveRunStatus(status: string): boolean {
  return status === "queued" || status === "running";
}

async function publishAgentRunUpdated(run: typeof agentRunTable.$inferSelect) {
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, run.taskId))
    .limit(1);

  if (!task) return;

  await publishEvent("agent_run.updated", {
    runId: run.id,
    taskId: run.taskId,
    projectId: task.projectId,
    status: run.status,
    agentName: run.agentName,
    error: run.error,
    type: "agent_run.updated",
  });
}

export async function createAndStartRun({
  taskId,
  agentId,
  agentName,
  initiatorId,
  trigger,
}: {
  taskId: string;
  agentId: string | null;
  agentName: string;
  initiatorId: string | null;
  trigger: "assigned" | "comment" | "rerun";
}) {
  const [existing] = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskId, taskId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  if (existing) {
    throw new HTTPException(409, {
      message: "This task already has an active agent run",
    });
  }

  const [run] = await db
    .insert(agentRunTable)
    .values({
      taskId,
      agentId,
      agentName,
      initiatorId,
      trigger,
      status: "queued",
    })
    .returning();

  if (!run) {
    throw new HTTPException(500, {
      message: "Failed to start agent run",
    });
  }

  void executeAgentRun(run.id);
  await publishAgentRunUpdated(run);
  return run;
}

export async function cancelAgentRun(runId: string) {
  cancelledByUser.add(runId);
  activeRuns.get(runId)?.abort();

  const [cancelled] = await db
    .update(agentRunTable)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(
      and(
        eq(agentRunTable.id, runId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    )
    .returning();

  if (cancelled) {
    await publishAgentRunUpdated(cancelled);
  }
  return cancelled;
}

export async function cancelActiveRunForTask(taskId: string) {
  const [active] = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskId, taskId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  if (active) {
    await cancelAgentRun(active.id);
  }
}

export async function getActiveRunForTask(taskId: string) {
  const [active] = await db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskId, taskId),
        inArray(agentRunTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  return active ?? null;
}

async function executeAgentRun(runId: string) {
  const controller = new AbortController();
  activeRuns.set(runId, controller);

  try {
    const [run] = await db
      .update(agentRunTable)
      .set({ status: "running", startedAt: new Date() })
      .where(
        and(
          eq(agentRunTable.id, runId),
          inArray(agentRunTable.status, ["queued", "running"]),
        ),
      )
      .returning();

    if (!run) return;

    await publishAgentRunUpdated(run);

    const context = await buildRunContext(run.taskId, run.trigger);

    const [agentRow] = run.agentId
      ? await db
          .select({
            instructions: agentTable.instructions,
            model: agentTable.model,
          })
          .from(agentTable)
          .where(eq(agentTable.id, run.agentId))
          .limit(1)
      : [];

    const state = { commentWritten: false };
    const tools = buildAgentTools({
      taskId: run.taskId,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      initiatorId: run.initiatorId ?? "",
      agent: { id: run.agentId, name: run.agentName },
      state,
    });

    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(RUN_TIMEOUT_MS),
    ]);

    const result = await runMastraAgent({
      name: run.agentName,
      instructions: agentRow?.instructions ?? "",
      model: agentRow?.model ?? null,
      context,
      tools,
      signal,
    });

    // A model that produced text without calling the comment tool still gets
    // to say something: persist its closing message as an agent comment.
    if (result.text.trim() && !state.commentWritten) {
      await createComment(
        run.taskId,
        run.initiatorId ?? "",
        result.text.trim(),
        undefined,
        { id: run.agentId ?? undefined, name: run.agentName },
      );
    }

    const [finished] = await db
      .update(agentRunTable)
      .set({ status: "succeeded", finishedAt: new Date() })
      .where(
        and(
          eq(agentRunTable.id, runId),
          inArray(agentRunTable.status, ["queued", "running"]),
        ),
      )
      .returning();

    if (finished) {
      await publishAgentRunUpdated(finished);
    }
  } catch (error) {
    const userCancelled = cancelledByUser.has(runId);
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    const [finished] = await db
      .update(agentRunTable)
      .set({
        status: userCancelled ? "cancelled" : "failed",
        error: userCancelled
          ? "Cancelled by user"
          : timedOut
            ? "Agent run timed out after 60 seconds"
            : error instanceof Error
              ? error.message
              : "Agent run failed",
        finishedAt: new Date(),
      })
      .where(
        and(
          eq(agentRunTable.id, runId),
          inArray(agentRunTable.status, ["queued", "running"]),
        ),
      )
      .returning();

    if (finished) {
      await publishAgentRunUpdated(finished);
      if (finished.status === "failed") {
        const [project] = await db
          .select({ projectId: projectTable.id })
          .from(projectTable)
          .innerJoin(taskTable, eq(taskTable.projectId, projectTable.id))
          .where(eq(taskTable.id, finished.taskId))
          .limit(1);

        await publishEvent("agent_run.failed", {
          runId: finished.id,
          taskId: finished.taskId,
          projectId: project?.projectId,
          userId: finished.initiatorId,
          agentName: finished.agentName,
          error: finished.error,
          type: "agent_run_failed",
        });
      }
    }
  } finally {
    activeRuns.delete(runId);
    cancelledByUser.delete(runId);
  }
}

// Runs that were queued or running when the API restarted never finished.
// They are marked failed so the task is not stuck with a phantom active run.
// Runs are never resumed after a restart. Each affected run publishes
// agent_run.failed so the task timeline records what happened.
export async function failInterruptedAgentRuns() {
  const affected = await db
    .update(agentRunTable)
    .set({
      status: "failed",
      error: "API restarted while this run was in progress",
      finishedAt: new Date(),
    })
    .where(inArray(agentRunTable.status, ["queued", "running"]))
    .returning();

  for (const run of affected) {
    const [project] = await db
      .select({ projectId: projectTable.id })
      .from(projectTable)
      .innerJoin(taskTable, eq(taskTable.projectId, projectTable.id))
      .where(eq(taskTable.id, run.taskId))
      .limit(1);

    await publishEvent("agent_run.failed", {
      runId: run.id,
      taskId: run.taskId,
      projectId: project?.projectId,
      userId: run.initiatorId,
      agentName: run.agentName,
      error: run.error,
      type: "agent_run_failed",
    });
  }
}
