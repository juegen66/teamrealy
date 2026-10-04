# Agent 的工具直接调 controller，不走 MCP over HTTP

第一版 Agent 使用固定工具集，由 Mastra 在 API 进程内调用现有 controller。不复用 MCP 工具，也不让 Agent 带着用户 token 再打一遍 HTTP。

MCP 工具已经覆盖 Task 和评论，但它们按外部客户端设计：OAuth、HTTP、调用者的完整权限。Agent 的权限必须是这次 Run 的 Initiator，范围必须锁在当前 Task / Project，并且不能提权。进程内调用可以共用 controller 和授权，不必给 Agent 发 token，也不必把建项目这类 MCP 工具暴露给它。
