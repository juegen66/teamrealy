import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectIndex: 0,
  insertResults: [] as unknown[][],
  insertIndex: 0,
  updateResults: [] as unknown[][],
  updateIndex: 0,
  setArgs: [] as unknown[],
  valuesArgs: [] as unknown[],
  createComment: vi.fn(),
  publishEvent: vi.fn(),
  buildRunContext: vi.fn(),
  runMastraAgent: vi.fn(),
  buildAgentTools: vi.fn(),
  hasAi: vi.fn(),
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  reset() {
    this.selectResults = [];
    this.selectIndex = 0;
    this.insertResults = [];
    this.insertIndex = 0;
    this.updateResults = [];
    this.updateIndex = 0;
    this.setArgs = [];
    this.valuesArgs = [];
    vi.clearAllMocks();
  },
  nextSelect(): unknown[] {
    return this.selectResults[this.selectIndex++] ?? [];
  },
  nextInsert(): unknown[] {
    return this.insertResults[this.insertIndex++] ?? [];
  },
  nextUpdate(): unknown[] {
    return this.updateResults[this.updateIndex++] ?? [];
  },
}));

vi.mock("../../../apps/api/src/database", () => {
  const makeSelectChain = () => ({
    from: () => makeSelectChain(),
    innerJoin: () => makeSelectChain(),
    where: () => makeSelectChain(),
    limit: () => Promise.resolve(mockState.nextSelect()),
  });

  const makeInsertChain = () => ({
    values: (args: unknown) => {
      mockState.valuesArgs.push(args);
      return makeInsertChain();
    },
    returning: () => Promise.resolve(mockState.nextInsert()),
  });

  const makeUpdateChain = () => ({
    set: (args: unknown) => {
      mockState.setArgs.push(args);
      return makeUpdateChain();
    },
    where: () => ({
      returning: () => Promise.resolve(mockState.nextUpdate()),
    }),
  });

  mockState.db.select.mockImplementation(makeSelectChain);
  mockState.db.insert.mockImplementation(makeInsertChain);
  mockState.db.update.mockImplementation(makeUpdateChain);

  return { default: mockState.db };
});

vi.mock("../../../apps/api/src/events", () => ({
  publishEvent: (...args: unknown[]) => mockState.publishEvent(...args),
}));

vi.mock("../../../apps/api/src/activity/controllers/create-comment", () => ({
  default: (...args: unknown[]) => mockState.createComment(...args),
}));

vi.mock("../../../apps/api/src/agent/runner/context", () => ({
  buildRunContext: (...args: unknown[]) => mockState.buildRunContext(...args),
}));

vi.mock("../../../apps/api/src/agent/runner/mastra-agent", () => ({
  runMastraAgent: (...args: unknown[]) => mockState.runMastraAgent(...args),
}));

vi.mock("../../../apps/api/src/agent/runner/tools", () => ({
  buildAgentTools: (...args: unknown[]) => mockState.buildAgentTools(...args),
}));

vi.mock("../../../apps/api/src/agent/config", () => ({
  hasAi: () => mockState.hasAi(),
  requireAi: vi.fn(),
}));

import { maybeStartCommentRun } from "../../../apps/api/src/agent/runner/comment-trigger";
import {
  createAndStartRun,
  failInterruptedAgentRuns,
  getActiveRunForTask,
  isActiveRunStatus,
} from "../../../apps/api/src/agent/runner/runner";

const RUN = {
  id: "run-1",
  taskId: "task-1",
  agentId: "agent-1",
  agentName: "Helper Bot",
  initiatorId: "user-1",
  trigger: "comment",
  status: "queued",
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: null,
  finishedAt: null,
};

const RUNNING = { ...RUN, status: "running", startedAt: new Date() };
const FINISHED = { ...RUN, status: "succeeded", finishedAt: new Date() };

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("agent runner", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.hasAi.mockReturnValue(true);
    mockState.createComment.mockResolvedValue(undefined);
    mockState.publishEvent.mockResolvedValue(undefined);
    mockState.buildRunContext.mockResolvedValue({
      projectId: "project-1",
      workspaceId: "workspace-1",
      task: { title: "Task" },
    });
    mockState.runMastraAgent.mockResolvedValue({ text: "" });
    mockState.buildAgentTools.mockReturnValue({});
  });

  describe("isActiveRunStatus", () => {
    it("treats queued and running as active", () => {
      expect(isActiveRunStatus("queued")).toBe(true);
      expect(isActiveRunStatus("running")).toBe(true);
      expect(isActiveRunStatus("succeeded")).toBe(false);
      expect(isActiveRunStatus("failed")).toBe(false);
      expect(isActiveRunStatus("cancelled")).toBe(false);
    });
  });

  describe("maybeStartCommentRun trigger rules", () => {
    it("does nothing when AI is disabled", async () => {
      mockState.hasAi.mockReturnValue(false);
      mockState.selectResults = [
        [{ id: "task-1", agentId: "agent-1" }],
        [],
        [{ id: "agent-1", name: "Helper Bot" }],
      ];

      await maybeStartCommentRun("task-1", "user-1");

      expect(mockState.db.select).not.toHaveBeenCalled();
      expect(mockState.db.insert).not.toHaveBeenCalled();
      expect(mockState.publishEvent).not.toHaveBeenCalled();
    });

    it("does nothing when the task has no agent assigned", async () => {
      mockState.selectResults = [[{ id: "task-1", agentId: null }]];

      await maybeStartCommentRun("task-1", "user-1");

      expect(mockState.db.insert).not.toHaveBeenCalled();
      expect(mockState.publishEvent).not.toHaveBeenCalled();
    });

    it("does nothing when the task already has an active run", async () => {
      mockState.selectResults = [
        [{ id: "task-1", agentId: "agent-1" }],
        [{ id: "run-existing" }],
      ];

      await maybeStartCommentRun("task-1", "user-1");

      expect(mockState.db.insert).not.toHaveBeenCalled();
      expect(mockState.publishEvent).not.toHaveBeenCalled();
    });

    it("does nothing when the assigned agent no longer exists", async () => {
      mockState.selectResults = [
        [{ id: "task-1", agentId: "agent-1" }],
        [],
        [],
      ];

      await maybeStartCommentRun("task-1", "user-1");

      expect(mockState.db.insert).not.toHaveBeenCalled();
      expect(mockState.publishEvent).not.toHaveBeenCalled();
    });

    it("starts a comment-triggered run for a human comment", async () => {
      mockState.selectResults = [
        [{ id: "task-1", agentId: "agent-1" }],
        [],
        [{ id: "agent-1", name: "Helper Bot" }],
        [],
        [{ projectId: "project-1" }],
        [{ projectId: "project-1" }],
        [{ instructions: "Be helpful", model: null }],
        [{ projectId: "project-1" }],
      ];
      mockState.insertResults = [[RUN]];
      mockState.updateResults = [[RUNNING], [FINISHED]];

      await maybeStartCommentRun("task-1", "user-1");
      await flushAsync();

      expect(mockState.db.insert).toHaveBeenCalledTimes(1);
      expect(mockState.valuesArgs[0]).toMatchObject({
        taskId: "task-1",
        agentId: "agent-1",
        agentName: "Helper Bot",
        initiatorId: "user-1",
        trigger: "comment",
        status: "queued",
      });
      expect(mockState.publishEvent).toHaveBeenCalledWith(
        "agent_run.updated",
        expect.objectContaining({ taskId: "task-1", status: "queued" }),
      );
      expect(mockState.publishEvent).toHaveBeenCalledWith(
        "agent_run.updated",
        expect.objectContaining({ status: "running" }),
      );
      expect(mockState.publishEvent).toHaveBeenCalledWith(
        "agent_run.updated",
        expect.objectContaining({ status: "succeeded" }),
      );
    });
  });

  describe("createAndStartRun", () => {
    it("rejects with 409 when the task already has an active run", async () => {
      mockState.selectResults = [[{ id: "run-existing" }]];

      await expect(
        createAndStartRun({
          taskId: "task-1",
          agentId: "agent-1",
          agentName: "Helper Bot",
          initiatorId: "user-1",
          trigger: "assigned",
        }),
      ).rejects.toMatchObject({ status: 409 });

      expect(mockState.db.insert).not.toHaveBeenCalled();
    });
  });

  describe("getActiveRunForTask", () => {
    it("returns the active run when one exists", async () => {
      mockState.selectResults = [[{ id: "run-1" }]];

      const active = await getActiveRunForTask("task-1");
      expect(active).toEqual({ id: "run-1" });
    });

    it("returns null when no run is active", async () => {
      mockState.selectResults = [[]];

      const active = await getActiveRunForTask("task-1");
      expect(active).toBeNull();
    });
  });

  describe("failInterruptedAgentRuns", () => {
    it("marks queued and running runs as failed on startup and publishes history", async () => {
      const interrupted = {
        id: "run-interrupted",
        taskId: "task-1",
        agentId: "agent-1",
        agentName: "Helper Bot",
        initiatorId: "user-1",
        trigger: "assigned",
        status: "failed",
        error: "API restarted while this run was in progress",
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        finishedAt: new Date(),
      };
      mockState.updateResults = [[interrupted]];
      mockState.selectResults = [[{ projectId: "project-1" }]];

      await failInterruptedAgentRuns();

      expect(mockState.db.update).toHaveBeenCalledWith(expect.anything());
      expect(mockState.setArgs[0]).toMatchObject({
        status: "failed",
        error: "API restarted while this run was in progress",
      });
      expect(
        (mockState.setArgs[0] as Record<string, unknown>).finishedAt,
      ).toBeInstanceOf(Date);
      expect(mockState.publishEvent).toHaveBeenCalledWith(
        "agent_run.failed",
        expect.objectContaining({
          runId: "run-interrupted",
          taskId: "task-1",
          projectId: "project-1",
          userId: "user-1",
          agentName: "Helper Bot",
          error: "API restarted while this run was in progress",
          type: "agent_run_failed",
        }),
      );
    });
  });
});
