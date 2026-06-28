import type { Phone, Role } from "@core/types/role.js";
import { ALLOWLIST_ROLES } from "@core/types/role.js";
import type { RoleStore } from "@core/ports/role-store.port.js";

export type { RoleStore };

// Resolucion DETERMINISTICA del rol. El LLM nunca decide identidad.
// Orden: allow-list cerrada -> rol sticky guardado -> es paciente en DB -> unknown.
export async function resolveRole(phone: Phone, store: RoleStore): Promise<Role> {
  const allow = await store.inAllowlist(phone);
  if (allow && ALLOWLIST_ROLES.has(allow)) return allow;

  const saved = await store.getRole(phone);
  if (saved && saved !== "unknown") return saved;

  if (await store.isPatient(phone)) return "paciente";

  return "unknown"; // -> triage/clasificador (solo aqui se permite LLM)
}
