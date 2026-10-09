import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectIndex: 0,
  createAndStartRun: vi.fn(),
  hasAi: true,
  db: { select: vi.fn() },
  reset() {
    this.selectResults = [];
    this.selectIndex = 0;
    this.hasAi = true;
    vi.clearAllMocks();
  },
  nextSelect(): unknown[] {
    return this.selectResults[this.selectIndex++] ?? [];
  },
}));

vi.mock("../../../apps/api/src/database", () => {
  // Each select() consumes one queued result. The agent list is awaited at
  // where(); the already-started check ends in limit().
  mockState.db.select.mockImplementation(() => {
    const result = Promise.resolve(mockState.nextSelect());
    const where = () =>
      Object.assign(result, { limit: () => result }) as Promise<unknown[]> & {
        limit: () => Promise<unknown[]>;
      };
    return { from: () => ({ where }) };
  });
  return { default: mockState.db };
});

vi.mock("../../../apps/api/src/agent/config", () => ({
  hasAi: () => mockState.hasAi,
}));

vi.mock("../../../apps/api/src/agent/runner/runner", () => ({
  createAndStartRun: (...args: unknown[]) =>
    mockState.createAndStartRun(...args),
}));

vi.mock("../../../apps/api/src/scheduler/leader-lock", () => ({
  withJobLease: (
    _name: string,
    run: () => Promise<unknown>,
    _whenHeldElsewhere: () => unknown,
  ) => run(),
}));

import { HTTPException } from "hono/http-exception";
import { runScheduledAgents } from "../../../apps/api/src/scheduler/agent-scheduled-runs";

const DAILY_AT_NINE = "0 9 * * *";

function agent(
  id: string,
  schedule: string,
  scheduleTimezone: string | null = null,
) {
  return { id, name: `Agent ${id}`, schedule, scheduleTimezone };
}

describe("runScheduledAgents", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.createAndStartRun.mockResolvedValue({ id: "run-1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 09:00 UTC, which is 18:00 in Asia/Tokyo. A null timezone means UTC.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 9, 0, 30)));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts a task-less scheduled run for an agent that is due", async () => {
    mockState.selectResults = [[agent("a1", DAILY_AT_NINE)], []];

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: false });
    expect(mockState.createAndStartRun).toHaveBeenCalledTimes(1);
    expect(mockState.createAndStartRun).toHaveBeenCalledWith({
      taskId: null,
      agentId: "a1",
      agentName: "Agent a1",
      initiatorId: null,
      trigger: "scheduled",
    });
  });

  it("evaluates the schedule in the agent's timezone", async () => {
    mockState.selectResults = [
      [
        agent("tokyo-due", "0 18 * * *", "Asia/Tokyo"),
        agent("tokyo-not-due", DAILY_AT_NINE, "Asia/Tokyo"),
      ],
      [],
    ];

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: false });
    expect(mockState.createAndStartRun).toHaveBeenCalledTimes(1);
    expect(mockState.createAndStartRun).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "tokyo-due", trigger: "scheduled" }),
    );
  });

  it("does nothing when AI is not configured", async () => {
    mockState.hasAi = false;
    mockState.selectResults = [[agent("a1", DAILY_AT_NINE)], []];

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: false });
    expect(mockState.db.select).not.toHaveBeenCalled();
    expect(mockState.createAndStartRun).not.toHaveBeenCalled();
  });

  it("does not start a run for an agent that is not due", async () => {
    mockState.selectResults = [[agent("a1", "30 9 * * *")]];

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: false });
    expect(mockState.createAndStartRun).not.toHaveBeenCalled();
  });

  it("skips an agent that already started a scheduled run this minute", async () => {
    mockState.selectResults = [[agent("a1", DAILY_AT_NINE)], [{ id: "run-0" }]];

    await runScheduledAgents();

    expect(mockState.createAndStartRun).not.toHaveBeenCalled();
  });

  it("swallows a 409 without marking the job degraded", async () => {
    mockState.selectResults = [[agent("a1", DAILY_AT_NINE)], []];
    mockState.createAndStartRun.mockRejectedValue(
      new HTTPException(409, { message: "active run" }),
    );

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: false });
    expect(mockState.createAndStartRun).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("marks the job degraded on an invalid cron but still runs other agents", async () => {
    mockState.selectResults = [
      [agent("bad", "not a cron"), agent("good", DAILY_AT_NINE)],
      [],
    ];

    const outcome = await runScheduledAgents();

    expect(outcome).toEqual({ degraded: true });
    expect(mockState.createAndStartRun).toHaveBeenCalledTimes(1);
    expect(mockState.createAndStartRun).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "good", trigger: "scheduled" }),
    );
  });
});
