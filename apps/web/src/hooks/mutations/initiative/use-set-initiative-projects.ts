import { useMutation, useQueryClient } from "@tanstack/react-query";
import setInitiativeProjects from "@/fetchers/initiative/set-initiative-projects";

function useSetInitiativeProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setInitiativeProjects,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useSetInitiativeProjects;
