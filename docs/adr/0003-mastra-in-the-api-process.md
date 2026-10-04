# Mastra 跑在 API 进程里，Kaneo 自己的表是真相来源

第一版把 Mastra 嵌在 API 进程中。`agent_run` 记录 queued / running / succeeded / failed / cancelled。API 启动时，把卡在 running 的 Run 标成 failed，不续跑。不用持久队列，也不把 Mastra Memory / Storage 当主存储。

第一版是短任务：读当前 Task，写评论，建子任务，改描述或状态。自托管单实例不应该为了这些再多一个 worker。进程内 EventEmitter 也不保存事件，所以 Run 必须有自己的表，重启后才能看到中断。
