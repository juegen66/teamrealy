import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type CancelTaskAgentRunRequest = InferRequestType<
  (typeof client)["agent"]["task"][":taskId"]["cancel"]["$post"]
>["param"];

async function cancelTaskAgentRun({ taskId }: CancelTaskAgentRunRequest) {
  const response = await client.agent.task[":taskId"].cancel.$post({
    param: { taskId },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default cancelTaskAgentRun;
