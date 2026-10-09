import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectIndex: 0,
  createComment: vi.fn(),
  createTask: vi.fn(),
  updateTaskAssignee: vi.fn(),
  db: { select: vi.fn() },
  reset() {
    this.selectResults = [];
    this.selectIndex = 0;
    vi.clearAllMocks();
  },
  nextSelect(): unknown[] {
    return this.selectResults[this.selectIndex++] ?? [];
  },
}));

vi.mock("../../../apps/api/src/database", () => {
  const makeSelectChain = () => ({
    from: () => makeSelectChain(),
    innerJoin: () => makeSelectChain(),
    leftJoin: () => makeSelectChain(),
    where: () => makeSelectChain(),
    orderBy: () => makeSelectChain(),
    limit: () => Promise.resolve(mockState.nextSelect()),
  });
  mockState.db.select.mockImplementation(makeSelectChain);
  return { default: mockState.db };
});

vi.mock("../../../apps/api/src/activity/controllers/create-comment", () => ({
  default: (...args: unknown[]) => mockState.createComment(...args),
}));
vi.mock("../../../apps/api/src/task/controllers/create-task", () => ({
  default: (...args: unknown[]) => mockState.createTask(...args),
}));
vi.mock("../../../apps/api/src/task/controllers/update-task-assignee", () => ({
  default: (...args: unknown[]) => mockState.updateTaskAssignee(...args),
}));
vi.mock(
  "../../../apps/api/src/task/controllers/update-task-description",
  () => ({
    default: vi.fn(),
  }),
);
vi.mock("../../../apps/api/src/task/controllers/update-task-priority", () => ({
  default: vi.fn(),
}));
vi.mock("../../../apps/api/src/task/controllers/update-task-status", () => ({
  default: vi.fn(),
}));
vi.mock(
  "../../../apps/api/src/task-relation/controllers/create-task-relation",
  () => ({ default: vi.fn() }),
);
vi.mock("../../../apps/api/src/label/controllers/assign-label-to-task", () => ({
  default: vi.fn(),
}));
vi.mock(
  "../../../apps/api/src/label/controllers/unassign-label-from-task",
  () => ({ default: vi.fn() }),
);
vi.mock("../../../apps/api/src/agent/runner/context", () => ({
  buildRunContext: vi.fn(),
}));

import {
  buildAgentTools,
  type RunToolContext,
} from "../../../apps/api/src/agent/runner/tools";

const TASK_BOUND_TOOLS = [
  "getTaskContext",
  "createComment",
  "createSubtask",
  "updateDescription",
  "updateStatus",
  "updatePriority",
  "attachLabel",
  "detachLabel",
];

const WORKSPACE_TOOLS = [
  "listProjects",
  "listMembers",
  "searchTasks",
  "getTask",
  "createTask",
  "assignTask",
  "commentOnTask",
];

function makeCtx(overrides: Partial<RunToolContext> = {}): RunToolContext {
  return {
    taskId: null,
    projectId: "",
    workspaceId: "workspace-1",
    initiatorId: null,
    agent: { id: "agent-1", name: "Scheduler Bot" },
    state: { commentWritten: false },
    ...overrides,
  };
}

type ToolResult = { ok: boolean; error?: string; [key: string]: unknown };

async function callTool(
  tools: ReturnType<typeof buildAgentTools>,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = (tools as unknown as Record<string, unknown>)[name] as {
    execute: (input: unknown, context: unknown) => Promise<ToolResult>;
  };
  return tool.execute(input, {});
}

describe("agent tools", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.createComment.mockResolvedValue(undefined);
    mockState.createTask.mockResolvedValue({ id: "new-task" });
    mockState.updateTaskAssignee.mockResolvedValue(undefined);
  });

  describe("tool registration", () => {
    it("gives a task-less run the workspace tools and no task-bound tools", () => {
      const names = Object.keys(buildAgentTools(makeCtx({ taskId: null })));

      expect(names).toEqual(expect.arrayContaining(WORKSPACE_TOOLS));
      for (const taskBound of TASK_BOUND_TOOLS) {
        expect(names).not.toContain(taskBound);
      }
    });

    it("gives a task-bound run both the workspace and task-bound tools", () => {
      const names = Object.keys(
        buildAgentTools(makeCtx({ taskId: "task-1", projectId: "project-1" })),
      );

      expect(names).toEqual(expect.arrayContaining(WORKSPACE_TOOLS));
      expect(names).toEqual(expect.arrayContaining(TASK_BOUND_TOOLS));
    });
  });

  describe("workspace boundary", () => {
    it("rejects a project from another workspace in createTask", async () => {
      mockState.selectResults = [[]];

      const result = await callTool(buildAgentTools(makeCtx()), "createTask", {
        projectId: "foreign-project",
        title: "Nope",
      });

      expect(result.ok).toBe(false);
      expect(mockState.createTask).not.toHaveBeenCalled();
    });

    it("rejects an assignee outside the workspace in createTask", async () => {
      mockState.selectResults = [[{ id: "project-1", name: "P" }], []];

      const result = await callTool(buildAgentTools(makeCtx()), "createTask", {
        projectId: "project-1",
        title: "Nope",
        assigneeId: "foreign-user",
      });

      expect(result.ok).toBe(false);
      expect(mockState.createTask).not.toHaveBeenCalled();
    });

    it("rejects a task from another workspace in assignTask", async () => {
      mockState.selectResults = [[]];

      const result = await callTool(buildAgentTools(makeCtx()), "assignTask", {
        taskId: "foreign-task",
        userId: "user-1",
      });

      expect(result.ok).toBe(false);
      expect(mockState.updateTaskAssignee).not.toHaveBeenCalled();
    });

    it("rejects a user outside the workspace in assignTask", async () => {
      mockState.selectResults = [
        [{ id: "task-1", projectId: "project-1" }],
        [],
      ];

      const result = await callTool(buildAgentTools(makeCtx()), "assignTask", {
        taskId: "task-1",
        userId: "foreign-user",
      });

      expect(result.ok).toBe(false);
      expect(mockState.updateTaskAssignee).not.toHaveBeenCalled();
    });

    it("rejects a task from another workspace in commentOnTask", async () => {
      mockState.selectResults = [[]];

      const result = await callTool(
        buildAgentTools(makeCtx()),
        "commentOnTask",
        { taskId: "foreign-task", content: "hello" },
      );

      expect(result.ok).toBe(false);
      expect(mockState.createComment).not.toHaveBeenCalled();
    });

    it("rejects a task from another workspace in getTask", async () => {
      mockState.selectResults = [[]];

      const result = await callTool(buildAgentTools(makeCtx()), "getTask", {
        taskId: "foreign-task",
      });

      expect(result.ok).toBe(false);
    });

    it("rejects a foreign project and a foreign assignee in searchTasks", async () => {
      mockState.selectResults = [[]];
      const foreignProject = await callTool(
        buildAgentTools(makeCtx()),
        "searchTasks",
        { projectId: "foreign-project" },
      );
      expect(foreignProject.ok).toBe(false);

      mockState.reset();
      mockState.selectResults = [[]];
      const foreignAssignee = await callTool(
        buildAgentTools(makeCtx()),
        "searchTasks",
        { assigneeId: "foreign-user" },
      );
      expect(foreignAssignee.ok).toBe(false);
    });

    it("rejects every id when the run has no workspace scope", async () => {
      const result = await callTool(
        buildAgentTools(makeCtx({ workspaceId: "" })),
        "assignTask",
        { taskId: "task-1", userId: null },
      );

      expect(result.ok).toBe(false);
      expect(mockState.db.select).not.toHaveBeenCalled();
      expect(mockState.updateTaskAssignee).not.toHaveBeenCalled();
    });
  });

  describe("agent attribution when no user started the run", () => {
    const agent = { id: "agent-1", name: "Scheduler Bot" };

    it("createTask passes a null user and the agent actor", async () => {
      mockState.selectResults = [[{ id: "project-1", name: "P" }]];

      const result = await callTool(buildAgentTools(makeCtx()), "createTask", {
        projectId: "project-1",
        title: "Weekly report",
      });

      expect(result).toMatchObject({ ok: true, taskId: "new-task" });
      expect(mockState.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-1",
          title: "Weekly report",
          currentUserId: null,
          agent,
        }),
      );
    });

    it("assignTask passes a null user and the agent actor", async () => {
      mockState.selectResults = [
        [{ id: "task-1", projectId: "project-1" }],
        [{ userId: "user-1" }],
      ];

      const result = await callTool(buildAgentTools(makeCtx()), "assignTask", {
        taskId: "task-1",
        userId: "user-1",
      });

      expect(result.ok).toBe(true);
      expect(mockState.updateTaskAssignee).toHaveBeenCalledWith({
        id: "task-1",
        userId: "user-1",
        currentUserId: null,
        agent,
      });
    });

    it("commentOnTask passes a null user and the agent as author", async () => {
      mockState.selectResults = [[{ id: "task-1", projectId: "project-1" }]];

      const result = await callTool(
        buildAgentTools(makeCtx()),
        "commentOnTask",
        { taskId: "task-1", content: "Heads up" },
      );

      expect(result.ok).toBe(true);
      expect(mockState.createComment).toHaveBeenCalledWith(
        "task-1",
        null,
        "Heads up",
        undefined,
        agent,
      );
    });
  });

  describe("human-initiated runs", () => {
    it("keep the initiating user as the actor and add no agent actor", async () => {
      mockState.selectResults = [[{ id: "project-1", name: "P" }]];

      await callTool(
        buildAgentTools(
          makeCtx({
            taskId: "task-1",
            projectId: "project-1",
            initiatorId: "user-9",
          }),
        ),
        "createTask",
        { projectId: "project-1", title: "From a human run" },
      );

      expect(mockState.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ currentUserId: "user-9", agent: undefined }),
      );
    });
  });
});
