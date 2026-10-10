import { useMutation, useQueryClient } from "@tanstack/react-query";
import addInitiativeLink from "@/fetchers/initiative/add-initiative-link";

function useAddInitiativeLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addInitiativeLink,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
  });
}

export default useAddInitiativeLink;
