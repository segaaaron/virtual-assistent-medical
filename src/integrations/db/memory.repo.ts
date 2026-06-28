import type { MemoryPort, ConversationTurn } from "@core/ports/memory.port.js";
import { query } from "@platform/db/index.js";

// Memoria por (namespace=rol, contact_id=telefono). La clave AISLA los roles.
export function createMemoryRepo(): MemoryPort {
  return {
    async load(namespace: string, contactId: string, limit: number): Promise<ConversationTurn[]> {
      const rows = await query<{ turn_role: string; content: string }>(
        `SELECT turn_role, content FROM (
           SELECT turn_role, content, id FROM conversation_memory
           WHERE namespace=$1 AND contact_id=$2 ORDER BY id DESC LIMIT $3
         ) t ORDER BY id ASC`,
        [namespace, contactId, limit],
      );
      return rows.map((r) => ({ role: r.turn_role === "assistant" ? "assistant" : "user", content: r.content }));
    },
    async append(namespace: string, contactId: string, turn: ConversationTurn): Promise<void> {
      await query("INSERT INTO conversation_memory (namespace, contact_id, turn_role, content) VALUES ($1,$2,$3,$4)", [
        namespace,
        contactId,
        turn.role,
        turn.content,
      ]);
    },
  };
}
