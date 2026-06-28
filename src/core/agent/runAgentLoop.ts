import type { LlmPort, LlmMessage, LlmToolDef, ToolExecutor } from "@core/ports/llm.port.js";
import type { ConversationTurn } from "@core/ports/memory.port.js";

export interface AgentLoopOpts {
  llm: LlmPort;
  system: string;
  history: ConversationTurn[];
  userText: string;
  tools: LlmToolDef[];
  execute: ToolExecutor;
  maxSteps?: number;
}

// Loop genérico de agente: chat -> (si pide tools) ejecuta -> repite -> texto final.
// Mecanismo reusable por todos los roles; el rol aporta system/tools/execute aislados.
export async function runAgentLoop(opts: AgentLoopOpts): Promise<string> {
  const max = opts.maxSteps ?? 4;
  const messages: LlmMessage[] = [
    { role: "system", content: opts.system },
    ...opts.history.map((t) => ({ role: t.role, content: t.content }) as LlmMessage),
    { role: "user", content: opts.userText },
  ];

  for (let step = 0; step < max; step++) {
    const res = await opts.llm.chat(messages, opts.tools);
    if (res.toolCalls?.length) {
      messages.push({ role: "assistant", content: res.text ?? "", toolCalls: res.toolCalls });
      for (const tc of res.toolCalls) {
        let result: unknown;
        try {
          result = await opts.execute(tc.name, tc.arguments);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "tool error" };
        }
        messages.push({ role: "tool", toolCallId: tc.id, content: JSON.stringify(result ?? null) });
      }
      continue;
    }
    return res.text ?? "";
  }
  // se agoto el presupuesto de pasos
  return "Disculpe, permítame consultarlo y le confirmo en un momento.";
}
