import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

type SetInitiativeProjectsInput = InferRequestType<
  (typeof client)["initiative"][":id"]["projects"]["$put"]
>;

export type SetInitiativeProjectsRequest = SetInitiativeProjectsInput["param"] &
  SetInitiativeProjectsInput["json"];

async function setInitiativeProjects({
  id,
  projectIds,
}: SetInitiativeProjectsRequest) {
  const response = await client.initiative[":id"].projects.$put({
    param: { id },
    json: { projectIds },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default setInitiativeProjects;
