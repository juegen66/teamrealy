import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

type AddInitiativeLinkRequest = {
  id: string;
  url: string;
  title?: string;
};

async function addInitiativeLink({ id, ...json }: AddInitiativeLinkRequest) {
  const response = await client.initiative[":id"].links.$post({
    param: { id },
    json,
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default addInitiativeLink;
