import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type App = ReturnType<typeof createApp>["app"];

const json = { "content-type": "application/json" };

function postInitiative(app: App, body: Record<string, unknown>) {
  return app.request("/api/initiative", {
    method: "POST",
    headers: json,
    body: JSON.stringify(body),
  });
}

async function seedTask(projectId: string, number: number, status: string) {
  await db.insert(schema.taskTable).values({
    projectId,
    title: `Task ${number}`,
    description: "",
    priority: "medium",
    status,
    number,
    position: number,
  });
}

describe("API integration: initiatives", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("rejects unauthenticated requests", async () => {
    mockAnonymousSession();
    const { app } = createApp();

    const response = await app.request("/api/initiative?workspaceId=missing");

    expect(response.status).toBe(401);
  });

  it("creates an initiative linked to projects and rolls up task progress", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const { project: first } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Alpha",
    });
    const { project: second } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Beta",
    });
    await seedTask(first.id, 1, "done");
    await seedTask(first.id, 2, "to-do");
    await seedTask(second.id, 1, "archived");
    await seedTask(second.id, 2, "in-progress");

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postInitiative(app, {
      workspaceId: member.workspace.id,
      name: "  Launch v2  ",
      ownerId: member.user.id,
      targetDate: "2026-12-31T00:00:00.000Z",
      projectIds: [first.id, second.id],
    });

    expect(response.status).toBe(200);
    const created = (await response.json()) as {
      id: string;
      name: string;
      status: string;
      ownerId: string | null;
      totalTasks: number;
      completedTasks: number;
      completionPercentage: number;
      projects: Array<{ id: string }>;
    };
    expect(created).toMatchObject({
      name: "Launch v2",
      status: "planned",
      ownerId: member.user.id,
      totalTasks: 4,
      completedTasks: 2,
      completionPercentage: 50,
    });
    expect(created.projects.map((p) => p.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );

    const listResponse = await app.request(
      `/api/initiative?workspaceId=${member.workspace.id}`,
    );
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as Array<{ id: string }>;
    expect(list.map((i) => i.id)).toEqual([created.id]);
  });

  it("replaces linked projects and keeps the projects when the initiative is deleted", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const { project: first } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const { project: second } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const createdResponse = await postInitiative(app, {
      workspaceId: member.workspace.id,
      name: "Goal",
      projectIds: [first.id],
    });
    const created = (await createdResponse.json()) as { id: string };

    const setResponse = await app.request(
      `/api/initiative/${created.id}/projects`,
      {
        method: "PUT",
        headers: json,
        body: JSON.stringify({ projectIds: [second.id] }),
      },
    );
    expect(setResponse.status).toBe(200);
    const updated = (await setResponse.json()) as {
      projects: Array<{ id: string }>;
    };
    expect(updated.projects.map((p) => p.id)).toEqual([second.id]);

    const deleteResponse = await app.request(`/api/initiative/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(200);

    const remainingLinks = await db.query.initiativeProjectTable.findMany();
    expect(remainingLinks).toHaveLength(0);
    const projects = await db.query.projectTable.findMany({
      where: eq(schema.projectTable.workspaceId, member.workspace.id),
    });
    expect(projects).toHaveLength(2);
  });

  it("rejects projects from another workspace", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const other = await createWorkspaceMember({ role: "admin" });
    const { project: foreign } = await createProjectFixture({
      workspaceId: other.workspace.id,
    });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postInitiative(app, {
      workspaceId: member.workspace.id,
      name: "Cross-workspace",
      projectIds: [foreign.id],
    });

    expect(response.status).toBe(400);
    expect(await db.query.initiativeTable.findMany()).toHaveLength(0);
  });

  it("rejects an owner who is not a workspace member", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    const outsider = await createWorkspaceMember({ role: "admin" });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await postInitiative(app, {
      workspaceId: member.workspace.id,
      name: "Bad owner",
      ownerId: outsider.user.id,
    });

    expect(response.status).toBe(400);
  });

  it("does not let another workspace's member read or change an initiative", async () => {
    const owner = await createWorkspaceMember({ role: "admin" });
    const outsider = await createWorkspaceMember({ role: "admin" });

    mockAuthenticatedSession(owner.user);
    const { app } = createApp();
    const created = (await (
      await postInitiative(app, {
        workspaceId: owner.workspace.id,
        name: "Private",
      })
    ).json()) as { id: string };

    mockAuthenticatedSession(outsider.user);

    const getResponse = await app.request(`/api/initiative/${created.id}`);
    expect(getResponse.status).toBe(403);

    const deleteResponse = await app.request(`/api/initiative/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(403);
    expect(await db.query.initiativeTable.findMany()).toHaveLength(1);
  });

  it("lets a viewer read but not create, update, or delete", async () => {
    const admin = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(admin.user);
    const { app } = createApp();
    const created = (await (
      await postInitiative(app, {
        workspaceId: admin.workspace.id,
        name: "Visible",
      })
    ).json()) as { id: string };

    const viewerId = `viewer-${created.id}`;
    await db.insert(schema.userTable).values({
      id: viewerId,
      email: `${viewerId}@example.com`,
      emailVerified: true,
      name: "Viewer",
    });
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: admin.workspace.id,
      userId: viewerId,
      role: "viewer",
      joinedAt: new Date(),
    });
    const [viewer] = await db
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.id, viewerId));
    mockAuthenticatedSession(viewer);

    const listResponse = await app.request(
      `/api/initiative?workspaceId=${admin.workspace.id}`,
    );
    expect(listResponse.status).toBe(200);

    const createResponse = await postInitiative(app, {
      workspaceId: admin.workspace.id,
      name: "Nope",
    });
    expect(createResponse.status).toBe(403);

    const updateResponse = await app.request(`/api/initiative/${created.id}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ name: "Renamed", status: "active" }),
    });
    expect(updateResponse.status).toBe(403);

    const deleteResponse = await app.request(`/api/initiative/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(403);
  });

  it("updates status, owner, and clears the target date", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const created = (await (
      await postInitiative(app, {
        workspaceId: member.workspace.id,
        name: "Goal",
        targetDate: "2026-12-31T00:00:00.000Z",
      })
    ).json()) as { id: string };

    const response = await app.request(`/api/initiative/${created.id}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        name: "Goal renamed",
        status: "active",
        ownerId: member.user.id,
        targetDate: null,
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: "Goal renamed",
      status: "active",
      ownerId: member.user.id,
      targetDate: null,
    });
  });
  it("patches individual fields without touching the others", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const created = (await (
      await postInitiative(app, {
        workspaceId: member.workspace.id,
        name: "Goal",
        summary: "One line",
        priority: "high",
      })
    ).json()) as { id: string };

    const response = await app.request(`/api/initiative/${created.id}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ summary: null, color: "#ff0000" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: "Goal",
      summary: null,
      color: "#ff0000",
      priority: "high",
      status: "planned",
    });
  });

  it("adds and removes resource links and rejects non-http urls", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const created = (await (
      await postInitiative(app, {
        workspaceId: member.workspace.id,
        name: "Goal",
      })
    ).json()) as { id: string };

    const bad = await app.request(`/api/initiative/${created.id}/links`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ url: "javascript:alert(1)" }),
    });
    expect(bad.status).toBe(400);

    const added = await app.request(`/api/initiative/${created.id}/links`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ url: "https://www.example.com/spec" }),
    });
    expect(added.status).toBe(200);
    const withLink = (await added.json()) as {
      links: Array<{ id: string; title: string; url: string }>;
    };
    expect(withLink.links).toHaveLength(1);
    expect(withLink.links[0]).toMatchObject({
      title: "example.com",
      url: "https://www.example.com/spec",
    });

    const removed = await app.request(
      `/api/initiative/${created.id}/links/${withLink.links[0]?.id}`,
      { method: "DELETE" },
    );
    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({ links: [] });
  });

  it("posts initiative updates with the author and lists newest first", async () => {
    const member = await createWorkspaceMember({ role: "admin" });
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const created = (await (
      await postInitiative(app, {
        workspaceId: member.workspace.id,
        name: "Goal",
      })
    ).json()) as { id: string };

    for (const [health, body] of [
      ["on-track", "First"],
      ["at-risk", "Second"],
    ]) {
      const response = await app.request(
        `/api/initiative/${created.id}/updates`,
        {
          method: "POST",
          headers: json,
          body: JSON.stringify({ health, body }),
        },
      );
      expect(response.status).toBe(200);
    }

    const list = (await (
      await app.request(`/api/initiative/${created.id}/updates`)
    ).json()) as Array<{
      body: string;
      health: string;
      author: { id: string } | null;
    }>;
    expect(list.map((u) => u.body)).toEqual(["Second", "First"]);
    expect(list[0]?.author?.id).toBe(member.user.id);
  });
});
