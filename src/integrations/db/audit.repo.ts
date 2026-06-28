import type { AuditPort } from "@core/ports/audit.port.js";
import { query } from "@platform/db/index.js";

export function createAuditRepo(): AuditPort {
  return {
    async log(event: string, data: Record<string, unknown>): Promise<void> {
      await query("INSERT INTO audit_log (event, data) VALUES ($1, $2)", [event, JSON.stringify(data)]);
    },
  };
}
