/**
 * Pure domain rules for the Notion-style collaboration workflow.
 *
 * Nothing in this module touches the database, HTTP, or events: every function
 * takes its inputs and returns new values without mutating them, so the API
 * layer stays responsible for persistence and realtime publication.
 */

export type IssueStatus = "triage" | "todo" | "in_progress" | "done";

export type Issue = {
  id: string;
  title: string;
  assigneeId: string | null;
  status: IssueStatus;
  deliverySummary?: string | null;
};

export type ExecutionTaskStatus = "todo" | "in_progress" | "done";

export type ExecutionTaskVariant = "A" | "B" | null;

export type ExecutionTask = {
  id: string;
  title: string;
  issueId: string;
  assigneeId: string;
  status: ExecutionTaskStatus;
  variant: ExecutionTaskVariant;
  adopted: boolean;
};

export type ClaimAndCloneResult = {
  issue: Issue;
  task: ExecutionTask;
  /** All execution tasks for the issue after the claim, including the clone. */
  tasks: ExecutionTask[];
};

/**
 * Claim an issue and clone its definition into an execution task.
 *
 * The first task has no variant. A second task gets variant "B" and labels the
 * existing task "A" when it has no variant yet, because the comparison is only
 * meaningful once both tasks exist.
 */
export function claimAndClone(
  issue: Issue,
  userId: string,
  existingTasks: readonly ExecutionTask[],
  genId: () => string,
): ClaimAndCloneResult {
  if (issue.status === "done") {
    throw new Error("Cannot claim a completed issue");
  }

  const issueTasks = existingTasks.filter((task) => task.issueId === issue.id);
  if (issueTasks.length >= 2) {
    throw new Error("Issue already has two execution tasks");
  }

  let tasks = [...issueTasks];
  let variant: ExecutionTaskVariant = null;
  const existing = issueTasks[0];
  if (existing) {
    variant = "B";
    if (existing.variant === null) {
      tasks = [{ ...existing, variant: "A" }, ...issueTasks.slice(1)];
    }
  }

  const task: ExecutionTask = {
    id: genId(),
    title: issue.title,
    issueId: issue.id,
    assigneeId: userId,
    status: "todo",
    variant,
    adopted: false,
  };

  return {
    issue: { ...issue, assigneeId: userId, status: "in_progress" },
    task,
    tasks: [...tasks, task],
  };
}

export type CompleteIssueResult = {
  issue: Issue;
  tasks: ExecutionTask[];
};

/**
 * Complete an issue with a delivery summary.
 *
 * When the issue produced more than one task the caller must pick the adopted
 * one; every other task is explicitly marked as not adopted.
 */
export function completeIssue(
  issue: Issue,
  tasks: readonly ExecutionTask[],
  summary: string,
  adoptedTaskId?: string,
): CompleteIssueResult {
  const trimmedSummary = summary.trim();
  if (trimmedSummary.length === 0) {
    throw new Error("A delivery summary is required");
  }

  if (tasks.length > 1 && adoptedTaskId === undefined) {
    throw new Error(
      "An adopted task is required when the issue has multiple execution tasks",
    );
  }

  if (
    adoptedTaskId !== undefined &&
    !tasks.some((task) => task.id === adoptedTaskId)
  ) {
    throw new Error("Adopted task does not belong to this issue");
  }

  return {
    issue: { ...issue, status: "done", deliverySummary: trimmedSummary },
    tasks: tasks.map((task) => ({
      ...task,
      adopted:
        adoptedTaskId === undefined ? task.adopted : task.id === adoptedTaskId,
    })),
  };
}

export type RequirementType =
  | "build"
  | "fix"
  | "better"
  | "decide"
  | "learn"
  | "help";

export const REQUIREMENT_STAGES = [
  "collect",
  "evaluate",
  "design",
  "schedule",
  "execute",
  "accept",
  "deliver",
  "retro",
] as const;

export type RequirementStage = (typeof REQUIREMENT_STAGES)[number];

export function advanceStage(stage: RequirementStage): RequirementStage {
  const index = REQUIREMENT_STAGES.indexOf(stage);
  if (index === -1) {
    throw new Error(`Unknown requirement stage: ${String(stage)}`);
  }

  const next: RequirementStage | undefined = REQUIREMENT_STAGES[index + 1];
  if (next === undefined) {
    throw new Error("retro is the final requirement stage");
  }

  return next;
}

/**
 * Share of done issues over every issue that left triage, rounded to an
 * integer percentage. Triage-only and empty backlogs report 0.
 */
export function executionProgress(issues: readonly Issue[]): number {
  const relevant = issues.filter((issue) => issue.status !== "triage");
  if (relevant.length === 0) {
    return 0;
  }

  const done = relevant.filter((issue) => issue.status === "done").length;
  const percent = Math.round((done / relevant.length) * 100);
  return Math.min(100, Math.max(0, percent));
}

export type IdeaStatus = "flash" | "half_thought" | "landed" | "shelved";

export type Idea = {
  id: string;
  title: string;
  ownerId: string;
  status: IdeaStatus;
  breakpoint?: string | null;
  jumpedFromId?: string | null;
};

export type IdeaDecision = "merge" | "promote" | "continue" | "shelve";

export function setBreakpoint(idea: Idea, note: string): Idea {
  const trimmedNote = note.trim();
  if (trimmedNote.length === 0) {
    throw new Error("A breakpoint note is required");
  }

  return { ...idea, status: "half_thought", breakpoint: trimmedNote };
}

export type SpawnIdeaResult = {
  parent: Idea;
  child: Idea;
};

export function spawnIdea(
  parent: Idea,
  title: string,
  genId: () => string,
): SpawnIdeaResult {
  return {
    parent: { ...parent, status: "half_thought" },
    child: {
      id: genId(),
      title,
      ownerId: parent.ownerId,
      status: "flash",
      breakpoint: null,
      jumpedFromId: parent.id,
    },
  };
}

export function resolveIdea(idea: Idea, decision: IdeaDecision): Idea {
  switch (decision) {
    case "merge":
    case "promote":
      return { ...idea, status: "landed" };
    case "continue":
      if (!idea.breakpoint || idea.breakpoint.trim().length === 0) {
        throw new Error("Continuing an idea requires a breakpoint");
      }
      return { ...idea, status: "half_thought" };
    case "shelve":
      return { ...idea, status: "shelved" };
    default:
      throw new Error(`Unknown idea decision: ${String(decision)}`);
  }
}

export function tooManyOpenThreads(
  ideas: readonly Idea[],
  ownerId: string,
  limit = 5,
): boolean {
  const openThreads = ideas.filter(
    (idea) => idea.ownerId === ownerId && idea.status === "half_thought",
  ).length;
  return openThreads > limit;
}

export type KnowledgeType = "exp" | "how" | "ref" | "adr";

export type KnowledgeEntry = {
  id: string;
  title: string;
  type: KnowledgeType;
  ownerId: string;
  lastVerifiedAt: Date;
};

function subtractCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  // Pin the day first so a shorter target month cannot roll the date forward.
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, daysInTargetMonth));
  return result;
}

export function needsReview(
  entry: KnowledgeEntry,
  now: Date,
  months = 3,
): boolean {
  const threshold = subtractCalendarMonths(now, months);
  return entry.lastVerifiedAt.getTime() < threshold.getTime();
}

export function pendingReview(
  entries: readonly KnowledgeEntry[],
  now: Date,
  months = 3,
): KnowledgeEntry[] {
  return entries.filter((entry) => needsReview(entry, now, months));
}

export type ProjectHealth = "on_track" | "at_risk" | "off_track";

export type ProjectUpdateSource = "member" | "advisor_agent";

export type ProjectUpdate = {
  id?: string;
  projectId?: string;
  health: ProjectHealth;
  source: ProjectUpdateSource;
  progress: string;
};

const PROJECT_HEALTH: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "off_track",
];

const PROJECT_UPDATE_SOURCES: readonly ProjectUpdateSource[] = [
  "member",
  "advisor_agent",
];

/**
 * Validate an update before it reaches activity or notifications. The runtime
 * checks also cover callers that bypass TypeScript with parsed JSON.
 */
export function validateProjectUpdate(update: ProjectUpdate): ProjectUpdate {
  if (update.progress.trim().length === 0) {
    throw new Error("Project update progress is required");
  }
  if (!PROJECT_HEALTH.includes(update.health)) {
    throw new Error(`Unknown project health: ${String(update.health)}`);
  }
  if (!PROJECT_UPDATE_SOURCES.includes(update.source)) {
    throw new Error(`Unknown project update source: ${String(update.source)}`);
  }

  return update;
}
