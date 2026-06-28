// Puerto hacia Chatwoot (inbox humano). Handoff = cambiar status pending<->open.
export interface CrmPort {
  // find-or-create contacto + conversacion en el inbox WhatsApp; idempotente (mapeo en DB).
  ensureConversation(phone: string, name?: string): Promise<number>;
  // espeja el mensaje ENTRANTE del paciente/visitador/familiar (lo que la Dra debe ver).
  postIncoming(conversationId: number, text: string): Promise<void>;
  postReply(conversationId: number, text: string): Promise<void>;
  postPrivateNote(conversationId: number, text: string): Promise<void>;
  handoffToHuman(conversationId: number): Promise<void>; // status -> open
  returnToBot(conversationId: number): Promise<void>;     // status -> pending
}
