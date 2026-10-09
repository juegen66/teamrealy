import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type UpdateAgentRequest = InferRequestType<
  (typeof client)["agent"][":id"]["$put"]
>["json"] &
  InferRequestType<(typeof client)["agent"][":id"]["$put"]>["param"];

async function updateAgent({
  id,
  name,
  instructions,
  model,
  schedule,
  scheduleTimezone,
}: UpdateAgentRequest) {
  const response = await client.agent[":id"].$put({
    param: { id },
    json: {
      name,
      instructions,
      ...(model ? { model } : {}),
      // null clears the value on the server; undefined leaves it unchanged.
      ...(schedule !== undefined ? { schedule } : {}),
      ...(scheduleTimezone !== undefined ? { scheduleTimezone } : {}),
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default updateAgent;
