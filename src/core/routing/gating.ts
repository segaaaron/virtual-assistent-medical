// Gating temporal (#QA-1). Mientras el bot NO esta validado en vivo con la doctora,
// solo responde a numeros explicitamente permitidos (doctora + numeros de prueba).
// A cualquier otro contacto: silencio total (no clasifica, no responde, no gasta LLM).
// Se apaga con env BOT_GATING=false una vez validado el end-to-end.
import type { Phone } from "@core/types/role.js";

const onlyDigits = (s: string): string => s.replace(/[^0-9]/g, "");

export interface GatingConfig {
  enabled: boolean;
  doctoraPhone: string;
  testPhones: readonly string[];
}

// true = el bot DEBE callar para este numero (gating activo y numero no permitido).
export function isGated(phone: Phone, cfg: GatingConfig): boolean {
  if (!cfg.enabled) return false;
  const p = onlyDigits(phone);
  if (p === onlyDigits(cfg.doctoraPhone)) return false;
  return !cfg.testPhones.some((t) => onlyDigits(t) === p);
}
