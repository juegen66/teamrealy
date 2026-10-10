import { useMutation, useQueryClient } from "@tanstack/react-query";
import createInitiativeUpdate from "@/fetchers/initiative/create-initiative-update";

function useCreateInitiativeUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInitiativeUpdate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useCreateInitiativeUpdate;
