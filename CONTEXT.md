# Kaneo

Kaneo 是一个自托管的项目管理平台。本文件是项目的领域词汇表。

## Language

### 工作项

**Workspace**:
最顶层的协作和授权边界。
_Avoid_: Organization, team

**Project**:
Workspace 内承载 Task 的容器。
_Avoid_: Board, repo

**Task**:
Project 中的一个工作项。最多一个 Assignee，最多一个被指派的 Agent。
_Avoid_: Issue, ticket, card

**Assignee**:
对 Task 负责的那个人类成员。Agent 永远不是 Assignee。
_Avoid_: Owner, agent

**Activity**:
Task 上持久、对人可见的历史。评论是一种 Activity。
_Avoid_: Log, audit trail

**Comment**:
Task 上的一条留言，属于 Activity。Agent 写的评论仍然归 Initiator，同时记录是哪个 Agent 写的。
_Avoid_: Message, note

### AI

**Agent**:
Workspace 内配置好的 AI 工人，有名称、指令，以及可选的模型覆盖。它可以被指派到 Task 上替 Assignee 干活，但不是 Workspace 成员。
_Avoid_: Bot, bot user, assistant, AI assignee

**Agent Run**:
某个 Agent 针对某个 Task 的一次执行。由指派、手动重新运行，或该 Task 上一条新的人类评论触发。Agent 自己的评论、对已有评论的编辑、以及导入/外部评论都不会触发。同一时刻一个 Task 只有一个活跃的 Agent Run。状态是 queued、running、succeeded、failed 或 cancelled。
_Avoid_: Job, execution, session

**Initiator**:
触发这次 Agent Run 的人类用户。Agent 使用这个人的权限干活，Agent 写的评论也记在这个人名下。
_Avoid_: Author, owner, caller

**Agent Assignment**:
Task 与 Agent 之间最多一对一的指派。指派和取消指派是对人可见的历史；一次 Agent Run 是当前状态，只有失败才会另外记入历史。
_Avoid_: Assignee, agent owner
