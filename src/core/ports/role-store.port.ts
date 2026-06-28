import type { Phone, Role } from "@core/types/role.js";

// Puerto de persistencia del rol. Implementado por un repo en integrations/db.
export interface RoleStore {
  getRole(phone: Phone): Promise<Role | null>;
  setRole(phone: Phone, role: Role): Promise<void>;
  isPatient(phone: Phone): Promise<boolean>;
  inAllowlist(phone: Phone): Promise<Role | null>; // doctora / familiar curados a mano
}
