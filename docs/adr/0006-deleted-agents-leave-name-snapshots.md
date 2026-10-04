# 删除 Agent 时保留名称快照，不删历史 Run

从 Workspace 删除某个 Agent 时：所有 Task 取消指派，该 Agent 的活跃 Run 取消。历史 Run 和 Agent 写过的评论把 `agentId` 置空，但留下当时的 Agent 名称。Task 删除则级联删除它的 Run。Initiator 被删除时，Run 保留，`initiatorId` 置空。

硬删历史会让「当时是谁让哪个 Agent 做的」无法回答。软删 Agent 行会让设置页和成员列表多一套「已归档」状态，第一版不值得。
