import { useQuery } from "@tanstack/react-query";
import getInitiatives from "@/fetchers/initiative/get-initiatives";

function useGetInitiatives(workspaceId: string) {
  return useQuery({
    enabled: Boolean(workspaceId),
    queryKey: ["initiatives", workspaceId],
    queryFn: () => getInitiatives({ workspaceId }),
  });
}

export default useGetInitiatives;
