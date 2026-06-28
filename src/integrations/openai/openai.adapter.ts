import OpenAI from "openai";
import type { Env } from "@config/env.js";
import { OPENAI_MODEL } from "@config/constants.js";
import type { LlmPort, LlmMessage, LlmToolDef, LlmCompletion } from "@core/ports/llm.port.js";
import type { ChatCompletionMessageParam } from "openai/resources/index";

// Adaptador OpenAI -> implementa LlmPort (function-calling). Mecanismo generico, sin roles.
export function createOpenAiAdapter(env: Env): LlmPort {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 2 });

  return {
    async chat(messages: LlmMessage[], tools: LlmToolDef[]): Promise<LlmCompletion> {
      const mapped: ChatCompletionMessageParam[] = messages.map((m) => {
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.toolCalls.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: JSON.stringify(c.arguments) },
            })),
          };
        }
        if (m.role === "tool") {
          return { role: "tool", tool_call_id: m.toolCallId ?? "", content: m.content };
        }
        return { role: m.role, content: m.content } as ChatCompletionMessageParam;
      });

      const res = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: mapped,
        tools: tools.length
          ? tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> },
            }))
          : undefined,
      });
      const choice = res.choices[0]?.message;
      return {
        text: choice?.content ?? undefined,
        toolCalls: choice?.tool_calls
          ?.filter((c) => c.type === "function")
          .map((c) => ({ id: c.id, name: c.function.name, arguments: safeJson(c.function.arguments) })),
      };
    },
  };
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}
