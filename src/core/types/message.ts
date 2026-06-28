import type { Phone, WaId } from "@core/types/role.js";

// Tipo de dominio del mensaje entrante (normalizado, agnostico de Meta).
export interface InboundMessage {
  waId: WaId;
  from: Phone;
  text: string;
  mediaType?: "audio" | "image";
  mediaId?: string;
  // respuesta a un boton interactivo (p.ej. la Dra respondiendo un aviso de visita)
  replyToId?: string; // context.id: wamid del mensaje al que responde
  buttonPayload?: string; // id del boton tocado
  timestamp: number;
}
