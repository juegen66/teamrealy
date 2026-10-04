import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteAgent from "@/fetchers/agent/delete-agent";

function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["agents"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["task"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["activities"],
      });
    },
  });
}

export default useDeleteAgent;
