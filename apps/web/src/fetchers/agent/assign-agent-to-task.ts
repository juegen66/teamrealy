import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AssignAgentRequest = InferRequestType<
  (typeof client)["agent"]["task"][":taskId"]["$put"]
>["json"] &
  InferRequestType<
    (typeof client)["agent"]["task"][":taskId"]["$put"]
  >["param"];

async function assignAgentToTask({ taskId, agentId }: AssignAgentRequest) {
  const response = await client.agent.task[":taskId"].$put({
    param: { taskId },
    json: { agentId },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export default assignAgentToTask;
