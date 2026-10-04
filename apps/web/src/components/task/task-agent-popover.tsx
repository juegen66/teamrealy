import { Check, Loader2, RotateCw, Square, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useAssignAgentToTask from "@/hooks/mutations/agent/use-assign-agent-to-task";
import useCancelTaskAgentRun from "@/hooks/mutations/agent/use-cancel-task-agent-run";
import useRerunTaskAgent from "@/hooks/mutations/agent/use-rerun-task-agent";
import useGetAgentsByWorkspace from "@/hooks/queries/agent/use-get-agents-by-workspace";
import useGetTaskAgentRun from "@/hooks/queries/agent/use-get-task-agent-run";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { getInitials } from "@/lib/get-initials";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskAgentPopoverProps = {
  task: Task;
  workspaceId: string;
  children: React.ReactNode;
};

function getRunStatusLabel(
  status: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  switch (status) {
    case "queued":
    case "running":
      return t("tasks:popover.agent.running");
    case "succeeded":
      return t("tasks:popover.agent.succeeded");
    case "failed":
      return t("tasks:popover.agent.failed");
    case "cancelled":
      return t("tasks:popover.agent.cancelled");
    default:
      return null;
  }
}

export default function TaskAgentPopover({
  task,
  workspaceId,
  children,
}: TaskAgentPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: config } = useGetConfig();
  const { canUpdateTasks } = useWorkspacePermission();
  const { data: agents = [] } = useGetAgentsByWorkspace(workspaceId);
  const { data: run } = useGetTaskAgentRun(task.id);
  const { mutateAsync: assignAgent } = useAssignAgentToTask();
  const { mutateAsync: rerun } = useRerunTaskAgent();
  const { mutateAsync: cancelRun, isPending: isCancelling } =
    useCancelTaskAgentRun();

  const hasAi = config?.hasAi === true;
  const canEdit = canUpdateTasks();

  const assignedAgent = agents.find((agent) => agent.id === task.agentId);
  const runIsActive = run?.status === "queued" || run?.status === "running";
  const runStatusLabel = getRunStatusLabel(run?.status, t);

  const handleAssign = useCallback(
    async (agentId: string) => {
      try {
        await assignAgent({ taskId: task.id, agentId });
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks:popover.agent.assignError"),
        );
      }
    },
    [assignAgent, t, task.id],
  );

  const handleUnassign = useCallback(async () => {
    try {
      await assignAgent({ taskId: task.id, agentId: null });
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.agent.assignError"),
      );
    }
  }, [assignAgent, t, task.id]);

  const handleRerun = useCallback(async () => {
    try {
      await rerun({ taskId: task.id });
      toast.success(t("tasks:popover.agent.rerunSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.agent.rerunError"),
      );
    }
  }, [rerun, t, task.id]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelRun({ taskId: task.id });
      toast.success(t("tasks:popover.agent.cancelSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.agent.cancelError"),
      );
    }
  }, [cancelRun, t, task.id]);

  if (!hasAi || !canEdit) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="max-h-80 space-y-1 overflow-y-auto p-1">
          {agents.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              {t("tasks:popover.agent.empty", {
                defaultValue: "No agents configured for this workspace",
              })}
            </div>
          )}

          {agents.map((agent) => (
            <Button
              key={agent.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 px-2"
              onClick={() => handleAssign(agent.id)}
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium border border-border/30">
                {getInitials(agent.name)}
              </span>
              <span className="text-sm truncate">{agent.name}</span>
              {task.agentId === agent.id && (
                <Check className="ml-auto h-4 w-4 shrink-0" />
              )}
            </Button>
          ))}
        </div>

        {task.agentId && (
          <div className="border-t border-border p-2 space-y-2">
            {runStatusLabel && (
              <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                {runIsActive ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                <span>{runStatusLabel}</span>
                {run?.status === "failed" && run.error ? (
                  <span className="truncate" title={run.error}>
                    · {run.error}
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-1">
              {runIsActive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 flex-1 text-xs gap-1.5"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {t("tasks:popover.agent.cancel")}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 flex-1 text-xs gap-1.5"
                  onClick={handleRerun}
                >
                  <RotateCw className="h-3 w-3" />
                  {t("tasks:popover.agent.rerun")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs gap-1.5"
                onClick={handleUnassign}
              >
                <X className="h-3 w-3" />
                {t("tasks:popover.agent.unassign")}
              </Button>
            </div>

            {assignedAgent && (
              <p className="px-1 text-[11px] text-muted-foreground/70 leading-snug">
                {assignedAgent.instructions.slice(0, 140)}
                {assignedAgent.instructions.length > 140 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
