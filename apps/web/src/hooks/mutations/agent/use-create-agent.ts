import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAgentRequest } from "@/fetchers/agent/create-agent";
import createAgent from "@/fetchers/agent/create-agent";

function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: (createdAgent, variables: CreateAgentRequest) => {
      queryClient.setQueryData(
        ["agents", variables.workspaceId],
        (existingAgents: Array<typeof createdAgent> | undefined) =>
          existingAgents ? [...existingAgents, createdAgent] : [createdAgent],
      );
      void queryClient.invalidateQueries({
        queryKey: ["agents", variables.workspaceId],
      });
    },
  });
}

export default useCreateAgent;
