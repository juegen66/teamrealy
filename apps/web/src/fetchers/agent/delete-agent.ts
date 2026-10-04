import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type DeleteAgentRequest = InferRequestType<
  (typeof client)["agent"][":id"]["$delete"]
>["param"];

async function deleteAgent({ id }: DeleteAgentRequest) {
  const response = await client.agent[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default deleteAgent;
