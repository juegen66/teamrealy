import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const agentIdParam = z.object({ id: z.string() });

export const taskIdParam = z.object({ taskId: z.string() });

export const createAgentBody = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional(),
});

export const updateAgentBody = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional(),
});

export const assignAgentBody = z.object({
  agentId: z.string().nullable(),
});
