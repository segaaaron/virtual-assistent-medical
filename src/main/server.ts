// Proceso WEBHOOK. Delgado: verifica firma, ACK <1s, y SOLO DESPUES (detached) persiste+encola.
import Fastify from "fastify";
import type { Queue } from "bullmq";
import { env } from "@config/env.js";
import { logger } from "@platform/logger/index.js";
import { createInboundQueue, persistRaw, connection } from "@platform/queue/index.js";
import { pool } from "@platform/db/index.js";
import { runMigrations } from "@platform/db/migrate.js";
import { verifySignature, safeEqual } from "../webhook/signature.js";
import { parseInbound } from "../webhook/inbound.dto.js";
import { enqueueMessage } from "../webhook/enqueue.js";

const app = Fastify({ logger: false });
const queue = createInboundQueue();

// body crudo para verificar la firma HMAC
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
  done(null, body);
});

// verificacion del webhook (GET) — Meta manda hub.challenge. Comparacion timing-safe del token.
app.get("/webhook", async (req, reply) => {
  const q = req.query as Record<string, string>;
  if (q["hub.mode"] === "subscribe" && safeEqual(q["hub.verify_token"] ?? "", env.WHATSAPP_VERIFY_TOKEN)) {
    return reply.code(200).send(q["hub.challenge"]);
  }
  return reply.code(403).send();
});

// recepcion (POST): valida firma -> ACK inmediato -> trabajo detached (no bloquea el ACK)
app.post("/webhook", async (req, reply) => {
  const raw = req.body as Buffer;
  const sig = req.headers["x-hub-signature-256"] as string | undefined;
  if (!verifySignature(raw, sig, env.WHATSAPP_APP_SECRET)) {
    return reply.code(401).send();
  }
  const now = Date.now();
  reply.code(200).send({ ok: true });
  // detached: el ACK ya se envio; Redis lento jamas retrasa la respuesta a Meta.
  setImmediate(() => void ingest(queue, raw, now));
  return reply;
});

async function ingest(q: Queue, raw: Buffer, receivedAt: number): Promise<void> {
  try {
    await persistRaw(raw); // auditoria/replay antes de procesar
    const messages = parseInbound(JSON.parse(raw.toString()));
    if (messages.length === 0) {
      logger.debug({}, "webhook sin mensajes (evento de estado u otro)");
      return;
    }
    for (const m of messages) {
      const queued = await enqueueMessage(q, m, receivedAt);
      logger.info({ waId: m.waId, queued }, queued ? "encolado" : "duplicado, descartado");
    }
  } catch (err) {
    logger.error({ err }, "ingest fallo (ya se hizo ACK)");
  }
}

app.get("/healthz", async () => ({ ok: true }));

// Auto-migra en el arranque (cada deploy aplica las migraciones PENDIENTES en PROD).
// Si falla, NO arranca (no servir con schema incompleto).
async function boot(): Promise<void> {
  const ran = await runMigrations();
  if (ran.length) logger.info({ ran }, "migraciones aplicadas al boot");
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info({ port: env.PORT }, "server (webhook) arriba");
}
boot().catch((err) => {
  logger.error({ err }, "boot fallo");
  process.exit(1);
});

// shutdown graceful: cierra cola/redis/db al recibir senal (Dokploy redeploy)
async function shutdown(): Promise<void> {
  logger.info({}, "server cerrando...");
  await app.close();
  await queue.close();
  await connection.quit();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
