import type { Phone } from "@core/types/role.js";

export interface Solicitud {
  id: number;
  wa_phone: string;
  nombre: string | null;
  laboratorio: string | null;
  cuando: string | null;
  estado: string;
}

// Solicitudes de visitadores (flujo determinístico hacia la Dra).
export interface SolicitudPort {
  create(phone: Phone, nombre: string, laboratorio: string, cuando: string): Promise<Solicitud>;
  setAvisoMsgId(id: number, msgId: string): Promise<void>;
  findByAvisoMsgId(msgId: string): Promise<Solicitud | null>;
  markResponded(id: number): Promise<void>;
  // estado "la Dra esta redactando una respuesta libre para una solicitud"
  setPending(draPhone: string, solicitudId: number): Promise<void>;
  getPending(draPhone: string): Promise<{ solicitudId: number; waPhone: string } | null>;
  clearPending(draPhone: string): Promise<void>;
}
