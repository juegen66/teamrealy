import { createOpenAI } from "@ai-sdk/openai";
import type { ToolsInput } from "@mastra/core/agent";
import { Agent } from "@mastra/core/agent";
import type { RunContext } from "./context";

export type MastraAgentResult = {
  text: string;
};

const SUFFIX_INSTRUCTIONS =
  "You work on one Kaneo task. Use the provided tools. Stay in this task and its project. Do not change the assignee. Do not delete tasks. If you complete the requested work, post a final comment summarizing what you did.";

export async function runMastraAgent({
  name,
  instructions,
  model,
  context,
  tools,
  signal,
}: {
  name: string;
  instructions: string;
  model: string | null;
  context: RunContext;
  tools: ToolsInput;
  signal: AbortSignal;
}): Promise<MastraAgentResult> {
  const openai = createOpenAI({
    apiKey: process.env.AI_API_KEY,
    ...(process.env.AI_BASE_URL ? { baseURL: process.env.AI_BASE_URL } : {}),
  });

  const agent = new Agent({
    id: name,
    name,
    instructions: `${instructions}\n\n${SUFFIX_INSTRUCTIONS}`,
    model: openai(model || process.env.AI_MODEL || "gpt-4o-mini"),
    tools,
  });

  const result = await agent.generate(context.userMessage, {
    maxSteps: 8,
    abortSignal: signal,
  });

  return { text: result.text ?? "" };
}
