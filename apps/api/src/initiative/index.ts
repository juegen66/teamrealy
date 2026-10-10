import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import addInitiativeLinkCtrl from "./controllers/add-initiative-link";
import createInitiativeCtrl from "./controllers/create-initiative";
import deleteInitiativeCtrl from "./controllers/delete-initiative";
import deleteInitiativeLinkCtrl from "./controllers/delete-initiative-link";
import getInitiativeCtrl from "./controllers/get-initiative";
import getInitiativesCtrl from "./controllers/get-initiatives";
import {
  createInitiativeUpdate,
  listInitiativeUpdates,
} from "./controllers/initiative-updates";
import setInitiativeProjectsCtrl from "./controllers/set-initiative-projects";
import updateInitiativeCtrl from "./controllers/update-initiative";
import {
  initiativeDetailSchema,
  initiativeListSchema,
  initiativeSchema,
  initiativeUpdateListSchema,
  initiativeUpdateSchema,
} from "./response";
import {
  createInitiativeBody,
  createInitiativeLinkBody,
  createInitiativeUpdateBody,
  initiativeLinkParam,
  initiativeParam,
  setInitiativeProjectsBody,
  updateInitiativeBody,
  workspaceIdQuery,
} from "./schema";

const listRoute = createRoute({
  method: "get",
  operationId: "listInitiatives",
  path: "/",
  tags: ["Initiatives"],
  summary: "List initiatives",
  description:
    "List a workspace's initiatives, newest first, each with its linked projects and task completion rollup.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: workspaceIdQuery },
  responses: {
    200: jsonResponse("List of initiatives", initiativeListSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
  },
});

const createRoute_ = createRoute({
  method: "post",
  operationId: "createInitiative",
  path: "/",
  tags: ["Initiatives"],
  summary: "Create initiative",
  description:
    "Create an initiative, optionally linking projects. Requires project:create.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission({ project: ["create"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createInitiativeBody } },
    },
  },
  responses: {
    200: jsonResponse("The created initiative", initiativeDetailSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
  },
});

const getRoute = createRoute({
  method: "get",
  operationId: "getInitiative",
  path: "/{id}",
  tags: ["Initiatives"],
  summary: "Get initiative",
  description: "Get a single initiative with its linked projects and rollup.",
  middleware: [workspaceAccess.fromInitiative()] as const,
  request: { params: initiativeParam },
  responses: {
    200: jsonResponse("Initiative details", initiativeDetailSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
    404: errorResponse("Initiative not found"),
  },
});

const updateRoute = createRoute({
  method: "put",
  operationId: "updateInitiative",
  path: "/{id}",
  tags: ["Initiatives"],
  summary: "Update initiative",
  description:
    "Partially update an initiative. Only the fields present in the body change; send null to clear a nullable field. Requires project:update.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: initiativeParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateInitiativeBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated initiative", initiativeDetailSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
    404: errorResponse("Initiative not found"),
  },
});

const setProjectsRoute = createRoute({
  method: "put",
  operationId: "setInitiativeProjects",
  path: "/{id}/projects",
  tags: ["Initiatives"],
  summary: "Set initiative projects",
  description:
    "Replace the set of projects linked to an initiative. Requires project:update.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: initiativeParam,
    body: {
      required: true,
      content: { "application/json": { schema: setInitiativeProjectsBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated initiative", initiativeDetailSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
    404: errorResponse("Initiative not found"),
  },
});

const deleteRoute = createRoute({
  method: "delete",
  operationId: "deleteInitiative",
  path: "/{id}",
  tags: ["Initiatives"],
  summary: "Delete initiative",
  description:
    "Delete an initiative. Linked projects and their tasks are kept. Requires project:delete.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["delete"] }),
  ] as const,
  request: { params: initiativeParam },
  responses: {
    200: jsonResponse("The deleted initiative", initiativeSchema),
    400: errorResponse(
      "Invalid request, or workspace ID could not be determined",
    ),
    403: errorResponse("No workspace access, or missing permission"),
    404: errorResponse("Initiative not found"),
  },
});

const notFoundResponses = {
  400: errorResponse(
    "Invalid request, or workspace ID could not be determined",
  ),
  403: errorResponse("No workspace access, or missing permission"),
  404: errorResponse("Initiative not found"),
};

const addLinkRoute = createRoute({
  method: "post",
  operationId: "addInitiativeLink",
  path: "/{id}/links",
  tags: ["Initiatives"],
  summary: "Add initiative resource link",
  description:
    "Attach an http(s) resource link to an initiative. Requires project:update.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: initiativeParam,
    body: {
      required: true,
      content: { "application/json": { schema: createInitiativeLinkBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated initiative", initiativeDetailSchema),
    ...notFoundResponses,
  },
});

const deleteLinkRoute = createRoute({
  method: "delete",
  operationId: "deleteInitiativeLink",
  path: "/{id}/links/{linkId}",
  tags: ["Initiatives"],
  summary: "Remove initiative resource link",
  description:
    "Remove a resource link from an initiative. Requires project:update.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: { params: initiativeLinkParam },
  responses: {
    200: jsonResponse("The updated initiative", initiativeDetailSchema),
    ...notFoundResponses,
  },
});

const listUpdatesRoute = createRoute({
  method: "get",
  operationId: "listInitiativeUpdates",
  path: "/{id}/updates",
  tags: ["Initiatives"],
  summary: "List initiative updates",
  description: "List status updates posted on an initiative, newest first.",
  middleware: [workspaceAccess.fromInitiative()] as const,
  request: { params: initiativeParam },
  responses: {
    200: jsonResponse("Initiative updates", initiativeUpdateListSchema),
    ...notFoundResponses,
  },
});

const createUpdateRoute = createRoute({
  method: "post",
  operationId: "createInitiativeUpdate",
  path: "/{id}/updates",
  tags: ["Initiatives"],
  summary: "Post initiative update",
  description:
    "Post a health update (on-track, at-risk, off-track) on an initiative. Requires project:update.",
  middleware: [
    workspaceAccess.fromInitiative(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: initiativeParam,
    body: {
      required: true,
      content: { "application/json": { schema: createInitiativeUpdateBody } },
    },
  },
  responses: {
    200: jsonResponse("The created update", initiativeUpdateSchema),
    ...notFoundResponses,
  },
});

const initiative = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(listRoute, async (c) => {
    const initiatives = await getInitiativesCtrl(c.get("workspaceId"));
    return c.json(initiatives, 200);
  })
  .openapi(createRoute_, async (c) => {
    const created = await createInitiativeCtrl(c.req.valid("json"));
    return c.json(created, 200);
  })
  .openapi(getRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await getInitiativeCtrl(id), 200);
  })
  .openapi(updateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const updated = await updateInitiativeCtrl(
      id,
      c.get("workspaceId"),
      c.req.valid("json"),
    );
    return c.json(updated, 200);
  })
  .openapi(setProjectsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { projectIds } = c.req.valid("json");
    const updated = await setInitiativeProjectsCtrl(
      id,
      c.get("workspaceId"),
      projectIds,
    );
    return c.json(updated, 200);
  })
  .openapi(addLinkRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await addInitiativeLinkCtrl(id, c.req.valid("json")), 200);
  })
  .openapi(deleteLinkRoute, async (c) => {
    const { id, linkId } = c.req.valid("param");
    return c.json(await deleteInitiativeLinkCtrl(id, linkId), 200);
  })
  .openapi(listUpdatesRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await listInitiativeUpdates(id), 200);
  })
  .openapi(createUpdateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const created = await createInitiativeUpdate(
      id,
      c.get("userId"),
      c.req.valid("json"),
    );
    return c.json(created, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await deleteInitiativeCtrl(id), 200);
  });

export default initiative;
