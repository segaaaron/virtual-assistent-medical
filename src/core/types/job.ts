import type { InboundMessage } from "@core/types/message.js";

// Payload del job de la cola (compartido por webhook=productor y jobs=consumidor).
// Vive en core para que ambos lo importen sin cruzar limites.
export interface InboundJob {
  message: InboundMessage;
  receivedAt: number;
}
