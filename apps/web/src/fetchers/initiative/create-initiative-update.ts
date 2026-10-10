import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

type CreateInitiativeUpdateRequest = {
  id: string;
  health: "on-track" | "at-risk" | "off-track";
  body: string;
};

async function createInitiativeUpdate({
  id,
  ...json
}: CreateInitiativeUpdateRequest) {
  const response = await client.initiative[":id"].updates.$post({
    param: { id },
    json,
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default createInitiativeUpdate;
