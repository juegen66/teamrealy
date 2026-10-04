import { useMutation, useQueryClient } from "@tanstack/react-query";
import assignAgentToTask from "@/fetchers/agent/assign-agent-to-task";

function useAssignAgentToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignAgentToTask,
    onSuccess: (_task, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agent-run", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
}

export default useAssignAgentToTask;
