import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasAi, requireAi } from "../../../apps/api/src/agent/config";

describe("agent config hasAi", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("DEMO_MODE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("is false when no AI_API_KEY is set", () => {
    expect(hasAi()).toBe(false);
  });

  it("is true when AI_API_KEY is set", () => {
    vi.stubEnv("AI_API_KEY", "sk-test");
    expect(hasAi()).toBe(true);
  });

  it("is false when DEMO_MODE is 'true' even with a key", () => {
    vi.stubEnv("AI_API_KEY", "sk-test");
    vi.stubEnv("DEMO_MODE", "true");
    expect(hasAi()).toBe(false);
  });

  it("is true when DEMO_MODE is any value other than 'true'", () => {
    vi.stubEnv("AI_API_KEY", "sk-test");
    vi.stubEnv("DEMO_MODE", "false");
    expect(hasAi()).toBe(true);
  });
});

describe("agent config requireAi", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it("returns 404 when AI is disabled", async () => {
    vi.stubEnv("AI_API_KEY", "");

    const next = vi.fn();
    const context = { req: { raw: new Request("https://example.com/") } };

    await expect(
      requireAi()(context as never, next as never),
    ).rejects.toMatchObject({
      status: 404,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when AI is enabled", async () => {
    vi.stubEnv("AI_API_KEY", "sk-test");

    const next = vi.fn(async () => undefined);
    const context = { req: { raw: new Request("https://example.com/") } };

    await requireAi()(context as never, next as never);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
