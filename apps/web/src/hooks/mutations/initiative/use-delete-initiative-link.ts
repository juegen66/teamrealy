import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteInitiativeLink from "@/fetchers/initiative/delete-initiative-link";

function useDeleteInitiativeLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInitiativeLink,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useDeleteInitiativeLink;
