import pino from "pino";
import { env } from "@config/env.js";

// Logger JSON estructurado. Redacta tokens y TELEFONO (PII de paciente — confidencialidad medica).
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "from",
      "*.from",
      "msg.from",
      "message.from",
      "*.phone",
      "*.wa_phone",
      "*.token",
      "*.WHATSAPP_TOKEN",
      "*.authorization",
      "req.headers.authorization",
    ],
    censor: "[redacted]",
  },
});

// child con contexto por mensaje: { requestId, role, waId }
export type LogContext = { requestId?: string; role?: string; waId?: string };
export const withContext = (ctx: LogContext) => logger.child(ctx);
