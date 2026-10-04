import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export function hasAi(): boolean {
  return Boolean(process.env.AI_API_KEY) && process.env.DEMO_MODE !== "true";
}

export function requireAi() {
  return async (_c: Context, next: Next) => {
    if (!hasAi()) {
      throw new HTTPException(404, { message: "Not found" });
    }
    await next();
  };
}
