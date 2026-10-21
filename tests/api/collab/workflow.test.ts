import { describe, expect, it } from "vitest";
import {
  advanceStage,
  claimAndClone,
  completeIssue,
  type ExecutionTask,
  executionProgress,
  type Idea,
  type Issue,
  type KnowledgeEntry,
  needsReview,
  pendingReview,
  REQUIREMENT_STAGES,
  resolveIdea,
  setBreakpoint,
  spawnIdea,
  tooManyOpenThreads,
  validateProjectUpdate,
} from "../../../apps/api/src/collab/workflow";

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    title: "Ship the new board",
    assigneeId: null,
    status: "todo",
    ...overrides,
  };
}

function makeTask(overrides: Partial<ExecutionTask> = {}): ExecutionTask {
  return {
    id: "task-1",
    title: "Ship the new board",
    issueId: "issue-1",
    assigneeId: "user-1",
    status: "todo",
    variant: null,
    adopted: false,
    ...overrides,
  };
}

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    title: "Idea",
    ownerId: "user-1",
    status: "flash",
    ...overrides,
  };
}

function makeEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: "entry-1",
    title: "Deploy notes",
    type: "how",
    ownerId: "user-1",
    lastVerifiedAt: new Date("2024-01-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("claimAndClone", () => {
  it("claims the issue and creates a first task without a variant", () => {
    const issue = makeIssue({ status: "triage" });
    const result = claimAndClone(issue, "user-7", [], () => "task-new");

    expect(result.issue).toEqual({
      ...issue,
      assigneeId: "user-7",
      status: "in_progress",
    });
    expect(result.task).toEqual({
      id: "task-new",
      title: issue.title,
      issueId: issue.id,
      assigneeId: "user-7",
      status: "todo",
      variant: null,
      adopted: false,
    });
    expect(result.tasks).toHaveLength(1);
  });

  it("does not mutate the issue or the existing tasks", () => {
    const issue = makeIssue();
    const existing = makeTask();
    claimAndClone(issue, "user-7", [existing], () => "task-new");

    expect(issue).toEqual(makeIssue());
    expect(existing).toEqual(makeTask());
  });

  it("labels the existing task A and the clone B", () => {
    const existing = makeTask({ id: "task-a" });
    const result = claimAndClone(
      makeIssue({ status: "in_progress" }),
      "user-2",
      [existing],
      () => "task-b",
    );

    expect(result.task.variant).toBe("B");
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]).toMatchObject({ id: "task-a", variant: "A" });
    expect(result.tasks[1]).toMatchObject({ id: "task-b", variant: "B" });
    expect(existing.variant).toBeNull();
  });

  it("keeps an existing variant and ignores tasks of other issues", () => {
    const existing = makeTask({ id: "task-a", variant: "A" });
    const other = makeTask({ id: "task-other", issueId: "issue-2" });
    const result = claimAndClone(
      makeIssue(),
      "user-2",
      [existing, other],
      () => "task-b",
    );

    expect(result.tasks.map((task) => task.id)).toEqual(["task-a", "task-b"]);
    expect(result.tasks[0]?.variant).toBe("A");
    expect(result.task.variant).toBe("B");
  });

  it("throws when the issue is done", () => {
    expect(() =>
      claimAndClone(makeIssue({ status: "done" }), "user-1", [], () => "x"),
    ).toThrow("Cannot claim a completed issue");
  });

  it("throws when the issue already has two tasks", () => {
    const tasks = [
      makeTask({ id: "task-a", variant: "A" }),
      makeTask({ id: "task-b", variant: "B" }),
    ];

    expect(() =>
      claimAndClone(makeIssue(), "user-1", tasks, () => "x"),
    ).toThrow("Issue already has two execution tasks");
  });
});

describe("completeIssue", () => {
  it("completes the issue with the trimmed summary", () => {
    const issue = makeIssue({ status: "in_progress" });
    const result = completeIssue(issue, [makeTask()], "  shipped  ");

    expect(result.issue).toEqual({
      ...issue,
      status: "done",
      deliverySummary: "shipped",
    });
    expect(result.tasks).toHaveLength(1);
  });

  it("marks only the adopted task when several exist", () => {
    const tasks = [
      makeTask({ id: "task-a", variant: "A" }),
      makeTask({ id: "task-b", variant: "B" }),
    ];
    const result = completeIssue(makeIssue(), tasks, "we shipped A", "task-b");

    expect(result.tasks).toEqual([
      { ...tasks[0], adopted: false },
      { ...tasks[1], adopted: true },
    ]);
    expect(tasks[1]?.adopted).toBe(false);
  });

  it("rejects an empty or whitespace summary", () => {
    expect(() => completeIssue(makeIssue(), [makeTask()], "")).toThrow(
      "A delivery summary is required",
    );
    expect(() => completeIssue(makeIssue(), [makeTask()], "   ")).toThrow(
      "A delivery summary is required",
    );
  });

  it("requires an adopted task when several tasks exist", () => {
    const tasks = [makeTask({ id: "task-a" }), makeTask({ id: "task-b" })];

    expect(() => completeIssue(makeIssue(), tasks, "done")).toThrow(
      "An adopted task is required when the issue has multiple execution tasks",
    );
  });

  it("rejects an adopted task that is not part of the issue", () => {
    expect(() =>
      completeIssue(makeIssue(), [makeTask()], "done", "missing"),
    ).toThrow("Adopted task does not belong to this issue");
  });
});

describe("requirement stages", () => {
  it("advances through every stage in order", () => {
    expect(REQUIREMENT_STAGES).toEqual([
      "collect",
      "evaluate",
      "design",
      "schedule",
      "execute",
      "accept",
      "deliver",
      "retro",
    ]);

    const visited = [REQUIREMENT_STAGES[0]];
    for (let stage = advanceStage("collect"); stage !== "retro"; ) {
      visited.push(stage);
      stage = advanceStage(stage);
    }
    visited.push("retro");

    expect(visited).toEqual([...REQUIREMENT_STAGES]);
  });

  it("throws at retro", () => {
    expect(() => advanceStage("retro")).toThrow(
      "retro is the final requirement stage",
    );
  });

  it("throws on an unknown stage", () => {
    expect(() => advanceStage("nope" as never)).toThrow(
      "Unknown requirement stage: nope",
    );
  });
});

describe("executionProgress", () => {
  it("returns 0 when there are no issues", () => {
    expect(executionProgress([])).toBe(0);
  });

  it("ignores triage issues", () => {
    expect(
      executionProgress([
        makeIssue({ id: "1", status: "triage" }),
        makeIssue({ id: "2", status: "triage" }),
      ]),
    ).toBe(0);
  });

  it("rounds the share of done issues", () => {
    const issues = [
      makeIssue({ id: "1", status: "done" }),
      makeIssue({ id: "2", status: "done" }),
      makeIssue({ id: "3", status: "in_progress" }),
      makeIssue({ id: "4", status: "triage" }),
    ];

    expect(executionProgress(issues)).toBe(67);
  });

  it("returns 100 when every non-triage issue is done", () => {
    expect(
      executionProgress([
        makeIssue({ id: "1", status: "done" }),
        makeIssue({ id: "2", status: "done" }),
      ]),
    ).toBe(100);
  });
});

describe("ideas", () => {
  it("sets a breakpoint and moves to half_thought", () => {
    const idea = makeIdea();
    const updated = setBreakpoint(idea, "  ask design about scope  ");

    expect(updated).toEqual({
      ...idea,
      status: "half_thought",
      breakpoint: "ask design about scope",
    });
    expect(idea.status).toBe("flash");
  });

  it("requires a breakpoint note", () => {
    expect(() => setBreakpoint(makeIdea(), "")).toThrow(
      "A breakpoint note is required",
    );
    expect(() => setBreakpoint(makeIdea(), "  ")).toThrow(
      "A breakpoint note is required",
    );
  });

  it("spawns a flash child and parks the parent", () => {
    const parent = makeIdea({ id: "idea-parent", status: "flash" });
    const { parent: updatedParent, child } = spawnIdea(
      parent,
      "Spinoff",
      () => "idea-child",
    );

    expect(updatedParent).toEqual({ ...parent, status: "half_thought" });
    expect(child).toEqual({
      id: "idea-child",
      title: "Spinoff",
      ownerId: parent.ownerId,
      status: "flash",
      breakpoint: null,
      jumpedFromId: parent.id,
    });
    expect(parent.status).toBe("flash");
  });

  it("resolves merge and promote as landed", () => {
    expect(resolveIdea(makeIdea(), "merge").status).toBe("landed");
    expect(resolveIdea(makeIdea(), "promote").status).toBe("landed");
  });

  it("resolves shelve as shelved", () => {
    expect(resolveIdea(makeIdea(), "shelve").status).toBe("shelved");
  });

  it("continues only with a breakpoint", () => {
    const idea = makeIdea({ status: "flash", breakpoint: "next week" });

    expect(resolveIdea(idea, "continue")).toEqual({
      ...idea,
      status: "half_thought",
    });
    expect(() => resolveIdea(makeIdea(), "continue")).toThrow(
      "Continuing an idea requires a breakpoint",
    );
    expect(() =>
      resolveIdea(makeIdea({ breakpoint: "   " }), "continue"),
    ).toThrow("Continuing an idea requires a breakpoint");
  });

  it("rejects an unknown decision", () => {
    expect(() => resolveIdea(makeIdea(), "archive" as never)).toThrow(
      "Unknown idea decision: archive",
    );
  });

  it("flags owners over the half_thought limit", () => {
    const openThreads = (count: number, ownerId = "user-1"): Idea[] =>
      Array.from({ length: count }, (_, index) =>
        makeIdea({
          id: `idea-${index}`,
          ownerId,
          status: "half_thought",
        }),
      );

    expect(tooManyOpenThreads(openThreads(5), "user-1")).toBe(false);
    expect(tooManyOpenThreads(openThreads(6), "user-1")).toBe(true);
    expect(tooManyOpenThreads(openThreads(6, "user-2"), "user-1")).toBe(false);
    expect(tooManyOpenThreads(openThreads(2), "user-1", 1)).toBe(true);
    expect(
      tooManyOpenThreads(
        [...openThreads(1), makeIdea({ status: "landed" })],
        "user-1",
        1,
      ),
    ).toBe(false);
  });
});

describe("knowledge review", () => {
  const now = new Date("2024-05-15T00:00:00.000Z");

  it("needs review when older than three calendar months", () => {
    expect(needsReview(makeEntry(), now)).toBe(true);
    expect(
      needsReview(
        makeEntry({ lastVerifiedAt: new Date("2024-02-15T00:00:00.000Z") }),
        now,
      ),
    ).toBe(false);
  });

  it("treats the exact boundary as verified", () => {
    expect(
      needsReview(
        makeEntry({ lastVerifiedAt: new Date("2024-02-15T00:00:00.000Z") }),
        now,
      ),
    ).toBe(false);
    expect(
      needsReview(
        makeEntry({ lastVerifiedAt: new Date("2024-02-14T23:59:59.999Z") }),
        now,
      ),
    ).toBe(true);
  });

  it("uses calendar months rather than fixed days", () => {
    const endOfMonthNow = new Date("2024-05-31T00:00:00.000Z");
    expect(
      needsReview(
        makeEntry({ lastVerifiedAt: new Date("2024-02-29T00:00:00.000Z") }),
        endOfMonthNow,
      ),
    ).toBe(false);
    expect(
      needsReview(
        makeEntry({ lastVerifiedAt: new Date("2024-02-28T00:00:00.000Z") }),
        endOfMonthNow,
      ),
    ).toBe(true);
  });

  it("honours a custom review window", () => {
    const entry = makeEntry({
      lastVerifiedAt: new Date("2024-04-15T00:00:00.000Z"),
    });

    expect(needsReview(entry, now)).toBe(false);
    expect(needsReview(entry, now, 1)).toBe(false);
    expect(needsReview(entry, now, 0)).toBe(true);
  });

  it("filters entries pending review", () => {
    const stale = makeEntry({ id: "stale" });
    const fresh = makeEntry({
      id: "fresh",
      lastVerifiedAt: new Date("2024-05-01T00:00:00.000Z"),
    });

    expect(pendingReview([stale, fresh], now)).toEqual([stale]);
    expect(pendingReview([], now)).toEqual([]);
  });
});

describe("validateProjectUpdate", () => {
  it("accepts a complete update", () => {
    const update = {
      projectId: "project-1",
      health: "on_track" as const,
      source: "member" as const,
      progress: "Shipped the first milestone",
    };

    expect(validateProjectUpdate(update)).toBe(update);
  });

  it("accepts advisor agent updates", () => {
    expect(
      validateProjectUpdate({
        projectId: "project-1",
        health: "at_risk",
        source: "advisor_agent",
        progress: "Scope is growing",
      }).health,
    ).toBe("at_risk");
  });

  it("requires non-empty progress", () => {
    expect(() =>
      validateProjectUpdate({
        projectId: "project-1",
        health: "on_track",
        source: "member",
        progress: "",
      }),
    ).toThrow("Project update progress is required");

    expect(() =>
      validateProjectUpdate({
        projectId: "project-1",
        health: "on_track",
        source: "member",
        progress: "   ",
      }),
    ).toThrow("Project update progress is required");
  });

  it("rejects unknown health and source values", () => {
    expect(() =>
      validateProjectUpdate({
        projectId: "project-1",
        health: "unknown" as never,
        source: "member",
        progress: "Fine",
      }),
    ).toThrow("Unknown project health: unknown");

    expect(() =>
      validateProjectUpdate({
        projectId: "project-1",
        health: "off_track",
        source: "bot" as never,
        progress: "Fine",
      }),
    ).toThrow("Unknown project update source: bot");
  });
});
