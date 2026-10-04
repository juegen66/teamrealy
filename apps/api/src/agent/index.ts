import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { taskSchema } from "../task/response";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { requireAi } from "./config";
import assignAgentToTask from "./controllers/assign-agent";
import cancelTaskAgentRun from "./controllers/cancel-run";
import createAgent from "./controllers/create-agent";
import deleteAgent from "./controllers/delete-agent";
import getAgentsByWorkspace from "./controllers/get-agents";
import getTaskAgentRun from "./controllers/get-run";
import rerunTaskAgent from "./controllers/rerun-run";
import updateAgent from "./controllers/update-agent";
import {
  agentListSchema,
  agentRunNullableSchema,
  agentRunSchema,
  agentSchema,
} from "./response";
import {
  agentIdParam,
  assignAgentBody,
  createAgentBody,
  taskIdParam,
  updateAgentBody,
  workspaceIdParam,
} from "./schema";

const listAgentsRoute = createRoute({
  method: "get",
  operationId: "listWorkspaceAgents",
  path: "/workspace/{workspaceId}",
  tags: ["Agents"],
  summary: "List workspace agents",
  description:
    "List the AI agents configured for a workspace. Available to any workspace member.",
  middleware: [requireAi(), workspaceAccess.fromParam()] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("List of workspace agents", agentListSchema),
    400: errorResponse(
      "Workspace ID could not be determined, or AI is not enabled",
    ),
    403: errorResponse("No access to the workspace"),
  },
});

const createAgentRoute = createRoute({
  method: "post",
  operationId: "createAgent",
  path: "/",
  tags: ["Agents"],
  summary: "Create agent",
  description:
    "Create a new workspace AI agent. Requires workspace:manage_settings.",
  middleware: [
    requireAi(),
    workspaceAccess.fromBody(),
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createAgentBody } },
    },
  },
  responses: {
    200: jsonResponse("Agent created successfully", agentSchema),
    400: errorResponse("Invalid body, or AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing workspace:manage_settings permission",
    ),
  },
});

const updateAgentRoute = createRoute({
  method: "put",
  operationId: "updateAgent",
  path: "/{id}",
  tags: ["Agents"],
  summary: "Update agent",
  description:
    "Update an agent's name, instructions, or model. Requires workspace:manage_settings.",
  middleware: [
    requireAi(),
    workspaceAccess.fromAgent(),
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
  ] as const,
  request: {
    params: agentIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateAgentBody } },
    },
  },
  responses: {
    200: jsonResponse("Agent updated successfully", agentSchema),
    400: errorResponse("Invalid body, or AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing workspace:manage_settings permission",
    ),
    404: errorResponse("Agent not found"),
  },
});

const deleteAgentRoute = createRoute({
  method: "delete",
  operationId: "deleteAgent",
  path: "/{id}",
  tags: ["Agents"],
  summary: "Delete agent",
  description:
    "Delete an agent. All tasks are unassigned, active runs are cancelled, and historical runs and agent comments keep their agent name snapshot. Requires workspace:manage_settings.",
  middleware: [
    requireAi(),
    workspaceAccess.fromAgent(),
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
  ] as const,
  request: { params: agentIdParam },
  responses: {
    200: jsonResponse("Agent deleted successfully", agentSchema),
    400: errorResponse("AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing workspace:manage_settings permission",
    ),
    404: errorResponse("Agent not found"),
  },
});

const assignAgentRoute = createRoute({
  method: "put",
  operationId: "assignAgentToTask",
  path: "/task/{taskId}",
  tags: ["Agents"],
  summary: "Assign or unassign agent",
  description:
    "Assign an agent to a task (starting a run), or send null to unassign and cancel the active run. Replacing an agent cancels the previous run.",
  middleware: [
    requireAi(),
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: {
    params: taskIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: assignAgentBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated task", taskSchema),
    400: errorResponse("Invalid body, or AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing task:update permission",
    ),
    404: errorResponse("Task or agent not found"),
    409: errorResponse("The task already has an active agent run"),
  },
});

const getTaskAgentRunRoute = createRoute({
  method: "get",
  operationId: "getTaskAgentRun",
  path: "/task/{taskId}/run",
  tags: ["Agents"],
  summary: "Get task agent run",
  description:
    "Get the latest agent run for a task, or null if the task never had one.",
  middleware: [requireAi(), workspaceAccess.fromTaskId()] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("The latest agent run, or null", agentRunNullableSchema),
    400: errorResponse("Unknown task, or AI is not enabled"),
    403: errorResponse("No access to the task's workspace"),
  },
});

const rerunTaskAgentRoute = createRoute({
  method: "post",
  operationId: "rerunTaskAgent",
  path: "/task/{taskId}/run",
  tags: ["Agents"],
  summary: "Rerun task agent",
  description:
    "Start a new run of the task's assigned agent. Fails with 409 while an active run is in progress.",
  middleware: [
    requireAi(),
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("The created run", agentRunSchema),
    400: errorResponse("AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing task:update permission",
    ),
    404: errorResponse("Task or assigned agent not found"),
    409: errorResponse(
      "The task already has an active agent run, or no agent is assigned",
    ),
  },
});

const cancelTaskAgentRunRoute = createRoute({
  method: "post",
  operationId: "cancelTaskAgentRun",
  path: "/task/{taskId}/cancel",
  tags: ["Agents"],
  summary: "Cancel task agent run",
  description:
    "Cancel the active agent run for a task. Partial work already written is kept.",
  middleware: [
    requireAi(),
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("The cancelled run", agentRunSchema),
    400: errorResponse("AI is not enabled"),
    403: errorResponse(
      "No workspace access, or missing task:update permission",
    ),
    404: errorResponse("No active agent run for this task"),
  },
});

const agent = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(listAgentsRoute, async (c) =>
    c.json(await getAgentsByWorkspace(c.req.valid("param").workspaceId), 200),
  )
  .openapi(createAgentRoute, async (c) => {
    const { workspaceId, name, instructions, model } = c.req.valid("json");
    return c.json(
      await createAgent({ workspaceId, name, instructions, model }),
      200,
    );
  })
  .openapi(updateAgentRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { name, instructions, model } = c.req.valid("json");
    return c.json(await updateAgent(id, { name, instructions, model }), 200);
  })
  .openapi(deleteAgentRoute, async (c) =>
    c.json(await deleteAgent(c.req.valid("param").id), 200),
  )
  .openapi(assignAgentRoute, async (c) => {
    const { taskId } = c.req.valid("param");
    const { agentId } = c.req.valid("json");
    return c.json(
      await assignAgentToTask({
        taskId,
        agentId,
        currentUserId: c.get("userId"),
        workspaceId: c.get("workspaceId"),
      }),
      200,
    );
  })
  .openapi(getTaskAgentRunRoute, async (c) =>
    c.json(await getTaskAgentRun(c.req.valid("param").taskId), 200),
  )
  .openapi(rerunTaskAgentRoute, async (c) =>
    c.json(
      await rerunTaskAgent({
        taskId: c.req.valid("param").taskId,
        currentUserId: c.get("userId"),
      }),
      200,
    ),
  )
  .openapi(cancelTaskAgentRunRoute, async (c) =>
    c.json(await cancelTaskAgentRun(c.req.valid("param").taskId), 200),
  );

export default agent;
