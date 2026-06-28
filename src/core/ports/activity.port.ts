// Actividad del contacto -> ventana de 24h de WhatsApp (mensajes libres solo si esta abierta).
export interface ActivityPort {
  recordInbound(phone: string, atMs: number): Promise<void>;
  isWithin24h(phone: string): Promise<boolean>;
}
