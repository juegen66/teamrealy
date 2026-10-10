import { z } from "../openapi";

export const INITIATIVE_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export const INITIATIVE_PRIORITIES = [
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const INITIATIVE_HEALTHS = ["on-track", "at-risk", "off-track"] as const;

export const initiativeParam = z.object({ id: z.string() });

export const initiativeLinkParam = z.object({
  id: z.string(),
  linkId: z.string(),
});

export const workspaceIdQuery = z.object({ workspaceId: z.string() });

const statusField = z.enum(INITIATIVE_STATUSES);
const priorityField = z.enum(INITIATIVE_PRIORITIES);

export const createInitiativeBody = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().nullable().optional(),
  status: statusField.optional(),
  priority: priorityField.optional(),
  ownerId: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  projectIds: z.array(z.string()).optional(),
});

export const updateInitiativeBody = z
  .object({
    name: z.string().min(1),
    summary: z.string().nullable(),
    description: z.string().nullable(),
    icon: z.string(),
    color: z.string().nullable(),
    status: statusField,
    priority: priorityField,
    ownerId: z.string().nullable(),
    targetDate: z.string().datetime().nullable(),
  })
  .partial()
  .openapi({
    description:
      "Only the fields present in the body are changed. Send null to clear a nullable field.",
  });

export const setInitiativeProjectsBody = z.object({
  projectIds: z.array(z.string()).openapi({
    description:
      "The complete set of projects linked to the initiative. Projects not listed are unlinked.",
  }),
});

export const createInitiativeLinkBody = z.object({
  title: z.string().optional(),
  url: z.string().url().max(2048),
});

export const createInitiativeUpdateBody = z.object({
  health: z.enum(INITIATIVE_HEALTHS),
  body: z.string().min(1),
});
