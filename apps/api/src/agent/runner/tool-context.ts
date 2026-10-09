import { HTTPException } from "hono/http-exception";
import type { AgentActor } from "../actor";

export type RunToolContext = {
  // Null on task-less (scheduled) runs.
  taskId: string | null;
  projectId: string;
  workspaceId: string;
  // Null when no user started the run, as with scheduled runs.
  initiatorId: string | null;
  agent: AgentActor;
  state: { commentWritten: boolean };
};

export function toolError(error: unknown): string {
  if (error instanceof HTTPException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown tool error";
}

// Human-initiated runs keep their existing attribution: the initiating user
// owns the activity. Only runs without a user attribute writes to the agent.
export function actorFor(ctx: RunToolContext): {
  currentUserId: string | null;
  agent: AgentActor | undefined;
} {
  return {
    currentUserId: ctx.initiatorId,
    agent: ctx.initiatorId ? undefined : ctx.agent,
  };
}
