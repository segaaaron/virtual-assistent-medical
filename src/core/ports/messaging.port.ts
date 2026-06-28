import type { Phone } from "@core/types/role.js";

export interface OutboundText {
  to: Phone;
  text: string;
}

export interface OutboundTemplate {
  to: Phone;
  template: string;
  language: string;
  variables?: string[];
}

export interface InteractiveButton {
  id: string; // payload que vuelve en la respuesta
  title: string; // max 20 chars (limite WhatsApp)
}

export interface ListRow {
  id: string; // payload que vuelve en la respuesta
  title: string; // max 24 chars
  description?: string;
}

export interface MessagingPort {
  sendText(msg: OutboundText): Promise<void>;
  sendTemplate(msg: OutboundTemplate): Promise<void>;
  // botones interactivos (max 3). Devuelve el wamid (para mapear la respuesta).
  sendButtons(to: Phone, body: string, buttons: InteractiveButton[]): Promise<string>;
  // lista interactiva (hasta 10 filas). Devuelve el wamid.
  sendList(to: Phone, body: string, buttonLabel: string, rows: ListRow[]): Promise<string>;
  isWithin24hWindow(to: Phone): Promise<boolean>;
}
