import { useQuery } from "@tanstack/react-query";
import getAgentsByWorkspace from "@/fetchers/agent/get-agents-by-workspace";
import useGetConfig from "@/hooks/queries/config/use-get-config";

function useGetAgentsByWorkspace(workspaceId: string) {
  const { data: config } = useGetConfig();

  return useQuery({
    // The API 404s agent routes when AI is disabled, so skip the request
    // (and its error) entirely when hasAi is false.
    enabled: Boolean(workspaceId) && config?.hasAi === true,
    queryKey: ["agents", workspaceId],
    queryFn: () => getAgentsByWorkspace({ workspaceId }),
  });
}

export default useGetAgentsByWorkspace;
