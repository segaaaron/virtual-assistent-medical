// Memoria conversacional AISLADA por namespace(rol) + contacto. La clave garantiza no-cruce.
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface MemoryPort {
  load(namespace: string, contactId: string, limit: number): Promise<ConversationTurn[]>;
  append(namespace: string, contactId: string, turn: ConversationTurn): Promise<void>;
}
