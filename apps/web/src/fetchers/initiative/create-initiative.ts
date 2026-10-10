import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type CreateInitiativeRequest = InferRequestType<
  (typeof client)["initiative"]["$post"]
>["json"];

async function createInitiative(json: CreateInitiativeRequest) {
  const response = await client.initiative.$post({ json });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default createInitiative;
