import { useQuery } from "@tanstack/react-query";
import getInitiative from "@/fetchers/initiative/get-initiative";

function useGetInitiative(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: ["initiatives", "detail", id],
    queryFn: () => getInitiative(id),
  });
}

export default useGetInitiative;
