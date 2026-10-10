import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getInitiative(id: string) {
  const response = await client.initiative[":id"].$get({ param: { id } });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json();
}

export default getInitiative;
