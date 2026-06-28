import type { MessagingPort } from "@core/ports/messaging.port.js";
import type { LlmPort } from "@core/ports/llm.port.js";
import type { CrmPort } from "@core/ports/crm.port.js";
import type { MemoryPort } from "@core/ports/memory.port.js";
import type { AgendaPort } from "@core/ports/agenda.port.js";
import type { SolicitudPort } from "@core/ports/solicitud.port.js";
import type { AuditPort } from "@core/ports/audit.port.js";
import type { ControlPort } from "@core/ports/control.port.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Logger } from "@shared/logger.js";

// Puertos que recibe cada agente de rol (subconjunto del container, sin roleStore ni infra).
export interface AgentDeps {
  messaging: MessagingPort;
  llm: LlmPort;
  crm: CrmPort;
  memory: MemoryPort;
  agenda: AgendaPort;
  solicitud: SolicitudPort;
  audit: AuditPort;
  control: ControlPort;
}

export interface RoleAgent {
  handle(message: InboundMessage, log: Logger): Promise<void>;
}
