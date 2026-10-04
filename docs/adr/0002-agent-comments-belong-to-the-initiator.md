# Agent 评论归 Initiator，并额外记录 Agent

Agent 写的评论记在触发这次 Run 的人（Initiator）名下，同时带上 `agentId`。界面显示「Agent X（经由 Alice）」。

公开的评论 API 走的是 `activity` 行（`type = comment`），不是遗留的 `comment` 表。Activity 已有 `externalUserName` / `externalSource`，那是给 GitHub、Gitea、导入用的，不用来表示 Agent。复用它们会把「外部系统里的人」和「Kaneo 自己的 Agent」混在一起。

## Considered Options

- **把 `userId` 留空，只填 `agentId`**：评论作者变成可空，现有「只有作者能编辑/删除」和成员通知都要改。
- **每个 Workspace 藏一个 bot 用户**：和「Agent 不是用户」冲突。
- **复用 `externalSource = "agent"`**：和导入、GitHub 评论抢同一套归因字段。
