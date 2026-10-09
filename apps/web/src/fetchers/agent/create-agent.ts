import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type CreateAgentRequest = InferRequestType<
  (typeof client)["agent"]["$post"]
>["json"];

async function createAgent({
  workspaceId,
  name,
  instructions,
  model,
  schedule,
  scheduleTimezone,
}: CreateAgentRequest) {
  const response = await client.agent.$post({
    json: {
      workspaceId,
      name,
      instructions,
      ...(model ? { model } : {}),
      ...(schedule ? { schedule } : {}),
      ...(schedule && scheduleTimezone ? { scheduleTimezone } : {}),
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default createAgent;
