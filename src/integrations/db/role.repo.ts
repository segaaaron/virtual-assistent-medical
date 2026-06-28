import type { RoleStore } from "@core/ports/role-store.port.js";
import type { Phone, Role } from "@core/types/role.js";
import { ROLES } from "@core/types/role.js";
import { query } from "@platform/db/index.js";
import { FAMILIAR_PHONES } from "@config/constants.js";
import { env } from "@config/env.js";

export function createRoleStore(): RoleStore {
  return {
    async inAllowlist(phone: Phone): Promise<Role | null> {
      if (phone === env.DOCTORA_PHONE) return "doctora";
      if (FAMILIAR_PHONES.includes(phone)) return "familiar";
      return null;
    },
    async getRole(phone: Phone): Promise<Role | null> {
      const rows = await query<{ role: string }>("SELECT role FROM contactos WHERE wa_phone=$1", [phone]);
      const r = rows[0]?.role;
      return r && (ROLES as readonly string[]).includes(r) ? (r as Role) : null;
    },
    async setRole(phone: Phone, role: Role): Promise<void> {
      await query(
        `INSERT INTO contactos (wa_phone, role) VALUES ($1, $2)
         ON CONFLICT (wa_phone) DO UPDATE SET role=$2, updated_at=now()`,
        [phone, role],
      );
    },
    async isPatient(phone: Phone): Promise<boolean> {
      const rows = await query<{ x: number }>("SELECT 1 AS x FROM pacientes WHERE wa_phone=$1", [phone]);
      return rows.length > 0;
    },
  };
}
