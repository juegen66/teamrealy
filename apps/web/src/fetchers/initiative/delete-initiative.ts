import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type DeleteInitiativeRequest = InferRequestType<
  (typeof client)["initiative"][":id"]["$delete"]
>["param"];

async function deleteInitiative({ id }: DeleteInitiativeRequest) {
  const response = await client.initiative[":id"].$delete({ param: { id } });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default deleteInitiative;
