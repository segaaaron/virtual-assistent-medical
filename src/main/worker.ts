// Proceso WORKER. Saca jobs de la cola, rutea rol, corre el agente, responde. Aqui vive el LLM.
import { logger } from "@platform/logger/index.js";
import { createInboundWorker, connection } from "@platform/queue/index.js";
import { pool } from "@platform/db/index.js";
import type { InboundJob } from "@core/types/job.js";
import { buildContainer } from "./container.js";
import { processMessage } from "../jobs/message.processor.js";

const container = buildContainer();

const worker = createInboundWorker(async (job) => {
  await processMessage(job.data as InboundJob, container);
});

worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "job fallido"));
worker.on("completed", (job) => logger.debug({ jobId: job.id }, "job ok"));

logger.info({}, "worker arriba, escuchando la cola");

// shutdown graceful: termina jobs en curso antes de cerrar (Dokploy redeploy)
async function shutdown(): Promise<void> {
  logger.info({}, "worker cerrando...");
  await worker.close();
  await connection.quit();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
