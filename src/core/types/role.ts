// Fuente unica de verdad del enum de roles. El rol es DATO, no opinion del LLM.
export const ROLES = ["familiar", "visitador", "paciente", "doctora", "unknown"] as const;
export type Role = (typeof ROLES)[number];

// Roles de allow-list cerrada: NADIE se promueve a ellos por clasificador.
export const ALLOWLIST_ROLES: ReadonlySet<Role> = new Set(["doctora", "familiar"]);

export type Phone = string & { readonly __brand: "Phone" }; // E.164 sin '+', solo digitos
export type WaId = string & { readonly __brand: "WaId" };   // id de mensaje (wamid)
