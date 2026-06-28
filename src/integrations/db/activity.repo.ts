import type { ActivityPort } from "@core/ports/activity.port.js";
import { query } from "@platform/db/index.js";

export function createActivityRepo(): ActivityPort {
  return {
    async recordInbound(phone: string, atMs: number): Promise<void> {
      const iso = new Date(atMs).toISOString();
      await query(
        `INSERT INTO contact_activity (wa_phone, last_inbound) VALUES ($1, $2)
         ON CONFLICT (wa_phone) DO UPDATE SET last_inbound = GREATEST(contact_activity.last_inbound, $2)`,
        [phone, iso],
      );
    },
    async isWithin24h(phone: string): Promise<boolean> {
      const rows = await query<{ ok: boolean }>(
        "SELECT (now() - last_inbound) < interval '24 hours' AS ok FROM contact_activity WHERE wa_phone=$1",
        [phone],
      );
      return rows[0]?.ok ?? false;
    },
  };
}
