import { useQuery } from "@tanstack/react-query";
import getInitiativeUpdates from "@/fetchers/initiative/get-initiative-updates";

function useGetInitiativeUpdates(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: ["initiatives", "updates", id],
    queryFn: () => getInitiativeUpdates(id),
  });
}

export default useGetInitiativeUpdates;
