import { useMutation, useQueryClient } from "@tanstack/react-query";
import createInitiative from "@/fetchers/initiative/create-initiative";

function useCreateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInitiative,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useCreateInitiative;
