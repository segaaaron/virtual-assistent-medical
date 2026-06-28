import type { Queue } from "bullmq";
import type { InboundMessage } from "@core/types/message.js";
import type { InboundJob } from "@core/types/job.js";

// Encola con jobId = wamid: BullMQ ignora jobIds duplicados -> idempotencia atomica,
// sin ventana de "marcado pero no encolado". Devuelve false si ya estaba (duplicado).
export async function enqueueMessage(queue: Queue, message: InboundMessage, receivedAt: number): Promise<boolean> {
  const existing = await queue.getJob(message.waId);
  if (existing) return false;
  const job: InboundJob = { message, receivedAt };
  await queue.add("inbound", job, { jobId: message.waId });
  return true;
}
