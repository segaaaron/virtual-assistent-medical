// Puerto del LLM. Mecanismo generico de function-calling; NO sabe de roles.
export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string; // en mensajes role=tool
  toolCalls?: LlmToolCall[]; // en mensajes role=assistant que pidieron tools
}

export interface LlmToolDef {
  name: string;
  description: string;
  parameters: unknown; // JSON Schema
}

export interface LlmCompletion {
  text?: string;
  toolCalls?: LlmToolCall[];
}

export interface LlmPort {
  chat(messages: LlmMessage[], tools: LlmToolDef[]): Promise<LlmCompletion>;
}

// Ejecutor de tools (lo provee cada rol). Recibe nombre + args, devuelve resultado serializable.
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;
