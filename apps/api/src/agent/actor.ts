// Attribution for writes made by an agent run that has no initiating user.
// Controllers store a null user id plus this agent on the activity row.
export type AgentActor = { id: string | null; name: string };
