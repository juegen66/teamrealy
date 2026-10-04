import { useMutation, useQueryClient } from "@tanstack/react-query";
import cancelTaskAgentRun from "@/fetchers/agent/cancel-task-agent-run";

function useCancelTaskAgentRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelTaskAgentRun,
    onSuccess: (_run, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-run", variables.taskId],
      });
    },
  });
}

export default useCancelTaskAgentRun;
