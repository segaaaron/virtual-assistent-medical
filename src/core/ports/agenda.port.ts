import type { Phone } from "@core/types/role.js";

export interface Slot {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
}

export interface BookResult {
  ok: boolean;
  citaId?: number;
  reason?: string; // p.ej. "franja ya ocupada"
}

export interface AgendaPort {
  // franjas disponibles reales (evita ofrecer ocupadas)
  availableSlots(tratamiento: string, max: number): Promise<Slot[]>;
  // bloquea/crea cita provisional; falla si la franja se ocupo (anti doble-reserva)
  book(slot: Slot, phone: Phone, tratamiento: string, nombre: string): Promise<BookResult>;
}
