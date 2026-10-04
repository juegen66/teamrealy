import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

// Runs never call a real model in tests: the in-process Mastra execution is
// stubbed so the run lifecycle (queued -> running -> succeeded) is exercised
// without any external API call.
const { runMastraAgent } = vi.hoisted(() => ({
  runMastraAgent: vi.fn(),
}));

vi.mock("../../apps/api/src/agent/runner/mastra-agent", () => ({
  runMastraAgent: (...args: unknown[]) => runMastraAgent(...args),
}));

const ORIGINAL_AI_API_KEY = process.env.AI_API_KEY;

async function waitForRun(
  taskId: string,
  predicate: (run: typeof schema.agentRunTable.$inferSelect) => boolean,
  timeoutMs = 2_000,
) {
  const deadline = Date.now() + timeoutMs;
  let run = await db.query.agentRunTable.findFirst({
    where: eq(schema.agentRunTable.taskId, taskId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  while ((!run || !predicate(run)) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    run = await db.query.agentRunTable.findFirst({
      where: eq(schema.agentRunTable.taskId, taskId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  return run;
}

describe("API integration: agents", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    process.env.AI_API_KEY = "sk-test";
    runMastraAgent.mockReset();
    runMastraAgent.mockResolvedValue({ text: "" });
  });

  afterEach(() => {
    if (ORIGINAL_AI_API_KEY === undefined) {
      delete process.env.AI_API_KEY;
    } else {
      process.env.AI_API_KEY = ORIGINAL_AI_API_KEY;
    }
  });

  it("allows workspace members to read agents but not create them", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const createResponse = await app.request("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: member.workspace.id,
        name: "Triage Bot",
        instructions: "Triage new tasks.",
      }),
    });

    expect(createResponse.status).toBe(403);

    const listResponse = await app.request(
      `/api/agent/workspace/${member.workspace.id}`,
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as unknown[];
    expect(listPayload).toEqual([]);
  });

  it("supports full CRUD for workspace managers", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    mockAuthenticatedSession(owner.user);
    const { app } = createApp();

    const createResponse = await app.request("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: owner.workspace.id,
        name: "Triage Bot",
        instructions: "Triage new tasks and summarize them.",
        model: "gpt-4o-mini",
      }),
    });

    expect(createResponse.status).toBe(200);
    const created =
      (await createResponse.json()) as typeof schema.agentTable.$inferSelect;
    expect(created).toMatchObject({
      workspaceId: owner.workspace.id,
      name: "Triage Bot",
      instructions: "Triage new tasks and summarize them.",
      model: "gpt-4o-mini",
    });

    const updateResponse = await app.request(`/api/agent/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Triage Bot v2",
        instructions: "Summarize new tasks.",
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updated =
      (await updateResponse.json()) as typeof schema.agentTable.$inferSelect;
    expect(updated).toMatchObject({
      id: created.id,
      name: "Triage Bot v2",
      instructions: "Summarize new tasks.",
      model: null,
    });

    const listResponse = await app.request(
      `/api/agent/workspace/${owner.workspace.id}`,
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as unknown[];
    expect(listPayload).toHaveLength(1);

    const deleteResponse = await app.request(`/api/agent/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(200);

    const remaining = await db.query.agentTable.findMany({
      where: eq(schema.agentTable.workspaceId, owner.workspace.id),
    });
    expect(remaining).toHaveLength(0);
  });

  it("assigns and unassigns an agent to a task as a member", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [agent] = await db
      .insert(schema.agentTable)
      .values({
        workspaceId: member.workspace.id,
        name: "Helper Bot",
        instructions: "Help with this task.",
      })
      .returning();

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Task with agent",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const assignResponse = await app.request(`/api/agent/task/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: agent.id }),
    });

    expect(assignResponse.status).toBe(200);
    const assigned =
      (await assignResponse.json()) as typeof schema.taskTable.$inferSelect;
    expect(assigned.agentId).toBe(agent.id);

    const run = await waitForRun(task.id, (row) => row.status === "succeeded");
    expect(run).toBeDefined();
    expect(run).toMatchObject({
      agentId: agent.id,
      agentName: "Helper Bot",
      initiatorId: member.user.id,
      trigger: "assigned",
      status: "succeeded",
    });

    const unassignResponse = await app.request(`/api/agent/task/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: null }),
    });

    expect(unassignResponse.status).toBe(200);
    const unassigned =
      (await unassignResponse.json()) as typeof schema.taskTable.$inferSelect;
    expect(unassigned.agentId).toBeNull();

    const activities = await db.query.activityTable.findMany({
      where: eq(schema.activityTable.taskId, task.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });
    const types = activities.map((row) => row.type);
    expect(types).toContain("agent_assigned");
    expect(types).toContain("agent_unassigned");
  });

  it("rejects a second run while the task has an active run", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project, columns } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });

    const [agent] = await db
      .insert(schema.agentTable)
      .values({
        workspaceId: owner.workspace.id,
        name: "Slow Bot",
        instructions: "Work slowly.",
      })
      .returning();

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: owner.user.id,
        title: "Task with active run",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    // Keep the run active until we cancel it.
    runMastraAgent.mockReturnValue(new Promise(() => {}));

    mockAuthenticatedSession(owner.user);
    const { app } = createApp();

    const firstAssign = await app.request(`/api/agent/task/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: agent.id }),
    });
    expect(firstAssign.status).toBe(200);

    // Assigning the same agent again is a no-op, not a conflict.
    const secondAssign = await app.request(`/api/agent/task/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: agent.id }),
    });
    expect(secondAssign.status).toBe(200);

    // Rerunning while a run is active conflicts.
    const rerunResponse = await app.request(`/api/agent/task/${task.id}/run`, {
      method: "POST",
    });
    expect(rerunResponse.status).toBe(409);

    const cancelResponse = await app.request(
      `/api/agent/task/${task.id}/cancel`,
      { method: "POST" },
    );
    expect(cancelResponse.status).toBe(200);
    const cancelled =
      (await cancelResponse.json()) as typeof schema.agentRunTable.$inferSelect;
    expect(cancelled.status).toBe("cancelled");
  });

  it("returns 404 for agent routes when AI is disabled", async () => {
    const member = await createWorkspaceMember();
    process.env.AI_API_KEY = "";

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const listResponse = await app.request(
      `/api/agent/workspace/${member.workspace.id}`,
    );
    expect(listResponse.status).toBe(404);

    const assignResponse = await app.request(
      "/api/agent/task/task-does-not-matter",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: null }),
      },
    );
    expect(assignResponse.status).toBe(404);
  });
});
