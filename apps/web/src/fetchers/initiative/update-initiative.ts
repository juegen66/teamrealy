import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

type UpdateInitiativeInput = InferRequestType<
  (typeof client)["initiative"][":id"]["$put"]
>;

export type UpdateInitiativeRequest = UpdateInitiativeInput["param"] &
  UpdateInitiativeInput["json"];

async function updateInitiative({ id, ...json }: UpdateInitiativeRequest) {
  const response = await client.initiative[":id"].$put({
    param: { id },
    json,
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default updateInitiative;
