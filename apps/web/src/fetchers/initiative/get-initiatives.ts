import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetInitiativesRequest = InferRequestType<
  (typeof client)["initiative"]["$get"]
>["query"];

async function getInitiatives({ workspaceId }: GetInitiativesRequest) {
  const response = await client.initiative.$get({ query: { workspaceId } });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default getInitiatives;
