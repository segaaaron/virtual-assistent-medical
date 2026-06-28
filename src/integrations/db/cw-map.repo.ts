import type { CwMapStore } from "@core/ports/cw-map.port.js";
import { query } from "@platform/db/index.js";

// Repo del mapeo wa_phone -> chatwoot_conversation_id (tabla cw_conversation_map).
export function createCwMapRepo(): CwMapStore {
  return {
    async get(phone: string): Promise<number | null> {
      const rows = await query<{ conversation_id: number }>(
        "SELECT conversation_id FROM cw_conversation_map WHERE wa_phone=$1 LIMIT 1",
        [phone],
      );
      return rows[0]?.conversation_id ?? null;
    },
    async set(phone: string, conversationId: number): Promise<void> {
      await query(
        "INSERT INTO cw_conversation_map (wa_phone, conversation_id) VALUES ($1, $2) ON CONFLICT (wa_phone) DO NOTHING",
        [phone, conversationId],
      );
    },
  };
}
