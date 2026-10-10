import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteInitiative from "@/fetchers/initiative/delete-initiative";

function useDeleteInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInitiative,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useDeleteInitiative;
