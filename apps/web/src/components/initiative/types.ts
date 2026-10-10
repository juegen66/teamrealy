import type useGetInitiative from "@/hooks/queries/initiative/use-get-initiative";

export type InitiativeDetail = NonNullable<
  ReturnType<typeof useGetInitiative>["data"]
>;

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

export const HEALTH_DOT_CLASS: Record<string, string> = {
  "on-track": "bg-emerald-500",
  "at-risk": "bg-amber-500",
  "off-track": "bg-red-500",
};
