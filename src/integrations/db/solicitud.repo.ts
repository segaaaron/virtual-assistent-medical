import type { SolicitudPort, Solicitud } from "@core/ports/solicitud.port.js";
import type { Phone } from "@core/types/role.js";
import { query } from "@platform/db/index.js";

export function createSolicitudRepo(): SolicitudPort {
  return {
    async create(phone: Phone, nombre: string, laboratorio: string, cuando: string): Promise<Solicitud> {
      const rows = await query<Solicitud>(
        `INSERT INTO solicitudes (wa_phone, nombre, laboratorio, cuando, estado)
         VALUES ($1,$2,$3,$4,'esperando_dra')
         RETURNING id, wa_phone, nombre, laboratorio, cuando, estado`,
        [phone, nombre, laboratorio, cuando],
      );
      return rows[0]!;
    },
    async setAvisoMsgId(id: number, msgId: string): Promise<void> {
      await query("UPDATE solicitudes SET aviso_msg_id=$2 WHERE id=$1", [id, msgId]);
    },
    async findByAvisoMsgId(msgId: string): Promise<Solicitud | null> {
      const rows = await query<Solicitud>(
        "SELECT id, wa_phone, nombre, laboratorio, cuando, estado FROM solicitudes WHERE aviso_msg_id=$1 AND estado='esperando_dra'",
        [msgId],
      );
      return rows[0] ?? null;
    },
    async markResponded(id: number): Promise<void> {
      await query("UPDATE solicitudes SET estado='respondida' WHERE id=$1", [id]);
    },
    async setPending(draPhone: string, solicitudId: number): Promise<void> {
      await query(
        `INSERT INTO dra_pendiente (dra_phone, solicitud_id, set_at) VALUES ($1,$2,now())
         ON CONFLICT (dra_phone) DO UPDATE SET solicitud_id=$2, set_at=now()`,
        [draPhone, solicitudId],
      );
    },
    async getPending(draPhone: string): Promise<{ solicitudId: number; waPhone: string } | null> {
      const rows = await query<{ solicitud_id: number; wa_phone: string }>(
        `SELECT p.solicitud_id, s.wa_phone FROM dra_pendiente p
         JOIN solicitudes s ON s.id = p.solicitud_id
         WHERE p.dra_phone=$1 AND s.estado='esperando_dra'`,
        [draPhone],
      );
      const r = rows[0];
      return r ? { solicitudId: r.solicitud_id, waPhone: r.wa_phone } : null;
    },
    async clearPending(draPhone: string): Promise<void> {
      await query("DELETE FROM dra_pendiente WHERE dra_phone=$1", [draPhone]);
    },
  };
}
