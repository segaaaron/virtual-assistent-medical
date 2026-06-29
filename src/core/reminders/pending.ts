// Logica PURA de idempotencia de recordatorios (testeable sin DB/red).
// Decide que citas falta avisar, descartando las ya registradas en reminder_log.
export interface CitaReminder {
  id: number;
  wa_phone: string;
  nombre: string;
  fecha: string; // YYYY-MM-DD
  hora: string;
}

export interface SentKey {
  cita_id: number;
  fecha_cita: string; // YYYY-MM-DD
}

// Devuelve solo las citas que AUN no fueron avisadas (no estan en `sent`).
export function pendingReminders(citas: CitaReminder[], sent: SentKey[]): CitaReminder[] {
  const seen = new Set(sent.map((s) => `${s.cita_id}|${s.fecha_cita}`));
  return citas.filter((c) => !seen.has(`${c.id}|${c.fecha}`));
}
