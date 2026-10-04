import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectIndex: 0,
  insertResults: [] as unknown[][],
  insertIndex: 0,
  valuesArgs: [] as unknown[],
  publishEvent: vi.fn(),
  createNotification: vi.fn(),
  maybeStartCommentRun: vi.fn(),
  reset() {
    this.selectResults = [];
    this.selectIndex = 0;
    this.insertResults = [];
    this.insertIndex = 0;
    this.valuesArgs = [];
    vi.clearAllMocks();
  },
  nextSelect(): unknown[] {
    return this.selectResults[this.selectIndex++] ?? [];
  },
  nextInsert(): unknown[] {
    return this.insertResults[this.insertIndex++] ?? [];
  },
}));

vi.mock("../../../apps/api/src/database", () => {
  const makeSelectChain = () => ({
    from: () => makeSelectChain(),
    innerJoin: () => makeSelectChain(),
    where: () => Promise.resolve().then(() => mockState.nextSelect()),
  });

  const makeInsertChain = () => ({
    values: (args: unknown) => {
      mockState.valuesArgs.push(args);
      return makeInsertChain();
    },
    returning: () => Promise.resolve(mockState.nextInsert()),
  });

  return {
    default: {
      select: () => makeSelectChain(),
      insert: () => makeInsertChain(),
    },
  };
});

vi.mock("../../../apps/api/src/events", () => ({
  publishEvent: (...args: unknown[]) => mockState.publishEvent(...args),
}));

vi.mock(
  "../../../apps/api/src/notification/controllers/create-notification",
  () => ({
    default: (...args: unknown[]) => mockState.createNotification(...args),
  }),
);

vi.mock("../../../apps/api/src/agent/runner/comment-trigger", () => ({
  maybeStartCommentRun: (...args: unknown[]) =>
    mockState.maybeStartCommentRun(...args),
}));

import createComment from "../../../apps/api/src/activity/controllers/create-comment";

const ACTIVITY = {
  id: "activity-1",
  taskId: "task-1",
  userId: "user-1",
  type: "comment",
  content: "Hello",
  createdAt: new Date(),
  agentId: null,
  agentName: null,
};

function setupCommentFlow(activity: unknown = ACTIVITY) {
  mockState.selectResults = [
    [{ name: "Alice" }],
    [
      {
        assigneeId: null,
        projectId: "project-1",
        title: "Task",
        workspaceId: "workspace-1",
      },
    ],
  ];
  mockState.insertResults = [[activity]];
  mockState.publishEvent.mockResolvedValue(undefined);
  mockState.createNotification.mockResolvedValue(undefined);
  mockState.maybeStartCommentRun.mockResolvedValue(undefined);
}

describe("createComment run-trigger rules", () => {
  beforeEach(() => {
    mockState.reset();
  });

  it("starts a run for a plain human comment", async () => {
    setupCommentFlow();

    await createComment("task-1", "user-1", "Hello");

    expect(mockState.maybeStartCommentRun).toHaveBeenCalledWith(
      "task-1",
      "user-1",
    );
  });

  it("never starts a run for an agent comment", async () => {
    setupCommentFlow({ ...ACTIVITY, agentId: "agent-1", agentName: "Bot" });

    await createComment("task-1", "user-1", "Hello", undefined, {
      id: "agent-1",
      name: "Bot",
    });

    expect(mockState.maybeStartCommentRun).not.toHaveBeenCalled();
    expect(mockState.valuesArgs[0]).toMatchObject({
      agentId: "agent-1",
      agentName: "Bot",
    });
  });

  it("never starts a run for an imported (external) comment", async () => {
    setupCommentFlow({
      ...ACTIVITY,
      externalUserName: "octocat",
      externalSource: "github",
    });

    await createComment("task-1", "user-1", "Hello", {
      userName: "octocat",
      source: "github",
    });

    expect(mockState.maybeStartCommentRun).not.toHaveBeenCalled();
  });
});
