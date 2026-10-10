import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateInitiative from "@/fetchers/initiative/update-initiative";

function useUpdateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInitiative,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useUpdateInitiative;
