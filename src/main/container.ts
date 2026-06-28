// COMPOSITION ROOT — el unico lugar que conoce implementaciones concretas.
import { env } from "@config/env.js";
import { logger } from "@platform/logger/index.js";
import type { MessagingPort } from "@core/ports/messaging.port.js";
import type { LlmPort } from "@core/ports/llm.port.js";
import type { RoleStore } from "@core/ports/role-store.port.js";
import type { MemoryPort } from "@core/ports/memory.port.js";
import type { AgendaPort } from "@core/ports/agenda.port.js";
import type { SolicitudPort } from "@core/ports/solicitud.port.js";
import type { AuditPort } from "@core/ports/audit.port.js";
import type { MediaPort } from "@core/ports/media.port.js";
import type { ActivityPort } from "@core/ports/activity.port.js";
import type { ControlPort } from "@core/ports/control.port.js";

import { createWhatsappAdapter } from "@integrations/whatsapp/whatsapp.adapter.js";
import { createOpenAiAdapter } from "@integrations/openai/openai.adapter.js";
import { createMediaAdapter } from "@integrations/media/media.adapter.js";
import { createRoleStore } from "@integrations/db/role.repo.js";
import { createMemoryRepo } from "@integrations/db/memory.repo.js";
import { createAgendaRepo } from "@integrations/db/agenda.repo.js";
import { createSolicitudRepo } from "@integrations/db/solicitud.repo.js";
import { createAuditRepo } from "@integrations/db/audit.repo.js";
import { createActivityRepo } from "@integrations/db/activity.repo.js";
import { createControlRepo } from "@integrations/db/control.repo.js";

export interface Container {
  messaging: MessagingPort;
  llm: LlmPort;
  roleStore: RoleStore;
  memory: MemoryPort;
  agenda: AgendaPort;
  solicitud: SolicitudPort;
  audit: AuditPort;
  media: MediaPort;
  activity: ActivityPort;
  control: ControlPort;
  log: typeof logger;
}

export function buildContainer(): Container {
  const activity = createActivityRepo();
  const messaging = createWhatsappAdapter(env, activity);
  return {
    messaging,
    llm: createOpenAiAdapter(env),
    media: createMediaAdapter(env),
    roleStore: createRoleStore(),
    memory: createMemoryRepo(),
    agenda: createAgendaRepo(),
    solicitud: createSolicitudRepo(),
    audit: createAuditRepo(),
    activity,
    control: createControlRepo(),
    log: logger,
  };
}
