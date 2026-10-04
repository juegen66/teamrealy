import { useQuery } from "@tanstack/react-query";
import getTaskAgentRun from "@/fetchers/agent/get-task-agent-run";
import useGetConfig from "@/hooks/queries/config/use-get-config";

function useGetTaskAgentRun(taskId: string) {
  const { data: config } = useGetConfig();

  return useQuery({
    // The API 404s agent routes when AI is disabled, so skip the request
    // (and its error) entirely when hasAi is false.
    enabled: Boolean(taskId) && config?.hasAi === true,
    queryKey: ["agent-run", taskId],
    queryFn: () => getTaskAgentRun({ taskId }),
    refetchInterval: (query) => {
      const run = query.state.data as { status?: string } | null | undefined;
      return run && (run.status === "queued" || run.status === "running")
        ? 5_000
        : false;
    },
  });
}

export default useGetTaskAgentRun;
