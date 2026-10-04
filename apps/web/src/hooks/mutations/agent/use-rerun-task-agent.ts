import { useMutation, useQueryClient } from "@tanstack/react-query";
import rerunTaskAgent from "@/fetchers/agent/rerun-task-agent";

function useRerunTaskAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rerunTaskAgent,
    onSuccess: (_run, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-run", variables.taskId],
      });
    },
  });
}

export default useRerunTaskAgent;
