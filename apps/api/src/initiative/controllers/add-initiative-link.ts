import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { initiativeLinkTable } from "../../database/schema";
import getInitiative from "./get-initiative";

function defaultTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function addInitiativeLink(
  initiativeId: string,
  input: { title?: string; url: string },
) {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new HTTPException(400, { message: "Link must be an http(s) URL" });
  }

  await db.insert(initiativeLinkTable).values({
    initiativeId,
    url,
    title: input.title?.trim() || defaultTitle(url),
  });

  return getInitiative(initiativeId);
}

export default addInitiativeLink;
