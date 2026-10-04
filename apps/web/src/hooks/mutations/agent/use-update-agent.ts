import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateAgent from "@/fetchers/agent/update-agent";

function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
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
    },
  });
}

export default useUpdateAgent;
