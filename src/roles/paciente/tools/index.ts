import type { LlmToolDef } from "@core/ports/llm.port.js";

// Tools EXPUESTAS SOLO al rol paciente (JSON Schema). Otro rol no las importa (barrel + boundaries).
export const pacienteTools: LlmToolDef[] = [
  {
    name: "checkAvailability",
    description: "Consulta franjas disponibles reales para un tratamiento. Devuelve hasta 3 opciones.",
    parameters: {
      type: "object",
      properties: { tratamiento: { type: "string" }, preferencia: { type: "string" } },
      required: ["tratamiento"],
    },
  },
  {
    name: "bookAppointment",
    description: "Bloquea/crea una cita provisional (queda PENDIENTE). Requiere franja exacta.",
    parameters: {
      type: "object",
      properties: {
        tratamiento: { type: "string" },
        nombre: { type: "string" },
        fecha: { type: "string", description: "YYYY-MM-DD" },
        hora: { type: "string", description: "HH:mm" },
      },
      required: ["tratamiento", "nombre", "fecha", "hora"],
    },
  },
  {
    name: "escalateToHuman",
    description: "Deriva a la Dra. ante cualquier duda clinica, bandera roja o aptitud del paciente.",
    parameters: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] },
  },
];
