// Constantes compartidas (sin secretos). Nombres de cola, timeouts, allow-lists.
export const QUEUE_INBOUND = "inbound-messages";

export const JOB_ATTEMPTS = 5;
export const JOB_BACKOFF_MS = 2000;

export const WORKER_SOFT_TIMEOUT_MS = 25_000;

// Modelo LLM (centralizado, no hardcodeado en el adaptador).
export const OPENAI_MODEL = "gpt-4o-mini"; // TODO: alinear con el modelo vigente del proyecto

// Plantillas Meta (deben aprobarse en WhatsApp Manager). Usadas fuera de la ventana 24h.
export const DRA_AVISO_TEMPLATE = "aviso_visita"; // TODO aprobar en Meta
export const CITA_REMINDER_TEMPLATE = "recordatorio_cita"; // TODO aprobar en Meta

// Nota: el numero personal de la doctora (allow-list/escalacion) vive en env.DOCTORA_PHONE
// y su nombre en env.DOCTORA_NAME — datos privados, NUNCA hardcodeados aqui.

// Chatwoot: inbox del canal WhatsApp ("Loreley WhatsApp"). Todo el espejo entra aqui.
export const CHATWOOT_WHATSAPP_INBOX_ID = 1;

// --- Agenda (horario real del consultorio, Bolivia UTC-4 sin horario de verano) ---
export const CLINIC_TZ_OFFSET = -4; // horas
export const WORKING_DAYS = [1, 2, 3, 4, 5]; // 0=domingo ... 6=sabado (lun-vie)
export const WORKING_HOURS = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00"];
export const SLOTS_LOOKAHEAD_DAYS = 10;
// Allow-list de familiares (numeros personales). Vacia por ahora; se agregan a mano.
export const FAMILIAR_PHONES: readonly string[] = [];
