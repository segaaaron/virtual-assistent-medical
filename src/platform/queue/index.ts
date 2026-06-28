import { Queue, Worker, type Processor, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { env } from "@config/env.js";
import { QUEUE_INBOUND, JOB_ATTEMPTS, JOB_BACKOFF_MS } from "@config/constants.js";

// Conexion Redis compartida (BullMQ requiere maxRetriesPerRequest: null).
export const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
// BullMQ empaqueta su propia copia de ioredis -> los tipos difieren. Cast seguro (misma instancia en runtime).
const bullConnection = connection as unknown as ConnectionOptions;

export function createInboundQueue(): Queue {
  return new Queue(QUEUE_INBOUND, {
    connection: bullConnection,
    defaultJobOptions: {
      attempts: JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: JOB_BACKOFF_MS },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

export function createInboundWorker(processor: Processor): Worker {
  return new Worker(QUEUE_INBOUND, processor, { connection: bullConnection });
}

// Persiste el payload CRUDO para auditoria/replay (Meta no tiene replay). Buffer acotado.
// TODO Fase 6: mover a tabla Postgres inbound_raw para retencion/consulta real.
export async function persistRaw(raw: Buffer): Promise<void> {
  await connection.lpush("inbound:raw", raw.toString());
  await connection.ltrim("inbound:raw", 0, 9999);
}
