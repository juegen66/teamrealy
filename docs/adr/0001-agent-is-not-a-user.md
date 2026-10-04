# Agent 不是用户，而是 Task 上独立的指派

Task 上的 Agent 使用独立的指派字段，不占用人类 Assignee 的位置，也不建成 bot 用户。人仍然对 Task 负责，Agent 只负责干活。

## Considered Options

- **把 Agent 建成 bot 用户，复用 Assignee 选择器**：改动看似最少，但 bot 会出现在成员列表、邀请、通知、按席位计费和权限角色里，每处都要加特殊判断。
- **Agent 取代 Assignee**：Task 只能有一个 Assignee，Agent 占位后就没人对结果负责。
