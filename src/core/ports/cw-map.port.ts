// Persistencia del mapeo idempotente wa_phone -> conversacion Chatwoot.
// Vive en la DB de brain (tabla cw_conversation_map). Evita duplicar conversaciones.
export interface CwMapStore {
  get(phone: string): Promise<number | null>;
  set(phone: string, conversationId: number): Promise<void>;
}
