import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetAgentsByWorkspaceRequest = InferRequestType<
  (typeof client)["agent"]["workspace"][":workspaceId"]["$get"]
>["param"];

async function getAgentsByWorkspace({
  workspaceId,
}: GetAgentsByWorkspaceRequest) {
  const response = await client.agent.workspace[":workspaceId"].$get({
    param: {
      workspaceId,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default getAgentsByWorkspace;
