import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

export const initiativeSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    summary: z.string().nullable(),
    description: z.string().nullable(),
    icon: z.string().nullable(),
    color: z.string().nullable(),
    status: z.string().openapi({
      description: "planned, active, paused, completed, or cancelled",
    }),
    priority: z.string().openapi({
      description: "no-priority, low, medium, high, or urgent",
    }),
    ownerId: z.string().nullable(),
    targetDate: nullableResponseTimestamp,
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("Initiative");

export const initiativeProjectSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    archivedAt: nullableResponseTimestamp,
    totalTasks: z.number(),
    completedTasks: z.number(),
  })
  .openapi("InitiativeProject");

export const initiativeLinkSchema = z
  .object({
    id: z.string(),
    initiativeId: z.string(),
    title: z.string(),
    url: z.string(),
    createdAt: responseTimestamp,
  })
  .openapi("InitiativeLink");

export const initiativeUpdateSchema = z
  .object({
    id: z.string(),
    initiativeId: z.string(),
    health: z.string().openapi({
      description: "on-track, at-risk, or off-track",
    }),
    body: z.string(),
    createdAt: responseTimestamp,
    author: z
      .object({
        id: z.string(),
        name: z.string(),
        image: z.string().nullable(),
      })
      .nullable(),
  })
  .openapi("InitiativeUpdate");

export const initiativeUpdateListSchema = z.array(initiativeUpdateSchema);

export const initiativeDetailSchema = initiativeSchema
  .extend({
    projects: z.array(initiativeProjectSummarySchema),
    links: z.array(initiativeLinkSchema),
    totalTasks: z.number(),
    completedTasks: z.number(),
    completionPercentage: z.number().openapi({
      description:
        "Share of tasks in done or archived columns across the linked projects, 0 to 100.",
    }),
  })
  .openapi("InitiativeDetail");

export const initiativeListSchema = z.array(initiativeDetailSchema);
