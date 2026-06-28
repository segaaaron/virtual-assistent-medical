import type { ControlPort } from "@core/ports/control.port.js";
import { query } from "@platform/db/index.js";

export function createControlRepo(): ControlPort {
  return {
    async isPaused(phone: string): Promise<boolean> {
      const rows = await query<{ x: number }>(
        "SELECT 1 AS x FROM bot_control WHERE wa_phone IN ($1, 'GLOBAL') LIMIT 1",
        [phone],
      );
      return rows.length > 0;
    },
    async pause(scope: string): Promise<void> {
      await query("INSERT INTO bot_control (wa_phone) VALUES ($1) ON CONFLICT DO NOTHING", [scope]);
    },
    async resume(scope: string): Promise<void> {
      await query("DELETE FROM bot_control WHERE wa_phone=$1", [scope]);
    },
  };
}
