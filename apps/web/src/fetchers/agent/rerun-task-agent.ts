import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type RerunTaskAgentRequest = InferRequestType<
  (typeof client)["agent"]["task"][":taskId"]["run"]["$post"]
>["param"];

async function rerunTaskAgent({ taskId }: RerunTaskAgentRequest) {
  const response = await client.agent.task[":taskId"].run.$post({
    param: { taskId },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default rerunTaskAgent;
