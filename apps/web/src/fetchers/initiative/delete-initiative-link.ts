import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

type DeleteInitiativeLinkRequest = { id: string; linkId: string };

async function deleteInitiativeLink(param: DeleteInitiativeLinkRequest) {
  const response = await client.initiative[":id"].links[":linkId"].$delete({
    param,
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default deleteInitiativeLink;
