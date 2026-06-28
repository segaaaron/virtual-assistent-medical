// Fakes en memoria de todos los puertos, con captura de llamadas. Para tests de flujo (sin DB/red).
import type { LlmCompletion } from "../../src/core/ports/llm.port.js";
import type { Solicitud } from "../../src/core/ports/solicitud.port.js";
import type { Role } from "../../src/core/types/role.js";

export interface FakeOpts {
  llm?: LlmCompletion[];
  allow?: Role | null; // inAllowlist
  saved?: Role | null; // getRole
  isPatient?: boolean;
  within24h?: boolean;
}

export function makeFakes(opts: FakeOpts = {}) {
  const sent: { to: string; text: string }[] = [];
  const lists: { to: string; body: string }[] = [];
  const templates: { to: string; template: string }[] = [];
  const audits: { event: string; data: Record<string, unknown> }[] = [];
  const paused = new Set<string>();
  const mem = new Map<string, { role: string; content: string }[]>();
  const solicitudes: (Solicitud & { aviso?: string })[] = [];
  const pending = new Map<string, number>();
  const roleSet: { phone: string; role: Role }[] = [];
  let solSeq = 1;
  const llmQueue = [...(opts.llm ?? [])];

  const messaging = {
    sendText: async (m: { to: string; text: string }) => void sent.push({ to: m.to, text: m.text }),
    sendTemplate: async (m: { to: string; template: string }) => void templates.push({ to: m.to, template: m.template }),
    sendButtons: async () => "wamid-btn",
    sendList: async (to: string, body: string) => {
      lists.push({ to, body });
      return "wamid-list";
    },
    isWithin24hWindow: async () => opts.within24h ?? true,
  };

  const llm = { chat: async (): Promise<LlmCompletion> => llmQueue.shift() ?? { text: "" } };

  const memory = {
    load: async (ns: string, c: string) => mem.get(`${ns}:${c}`) ?? [],
    append: async (ns: string, c: string, t: { role: string; content: string }) => {
      const k = `${ns}:${c}`;
      mem.set(k, [...(mem.get(k) ?? []), t]);
    },
  };

  const agenda = {
    availableSlots: async () => [{ fecha: "2026-07-01", hora: "10:00" }],
    book: async () => ({ ok: true, citaId: 1 }),
  };

  const solicitud = {
    create: async (phone: string, nombre: string, laboratorio: string, cuando: string) => {
      const s = { id: solSeq++, wa_phone: phone, nombre, laboratorio, cuando, estado: "esperando_dra" };
      solicitudes.push(s);
      return s;
    },
    setAvisoMsgId: async (id: number, msgId: string) => {
      const s = solicitudes.find((x) => x.id === id);
      if (s) s.aviso = msgId;
    },
    findByAvisoMsgId: async (msgId: string) =>
      solicitudes.find((x) => x.aviso === msgId && x.estado === "esperando_dra") ?? null,
    markResponded: async (id: number) => {
      const s = solicitudes.find((x) => x.id === id);
      if (s) s.estado = "respondida";
    },
    setPending: async (dra: string, id: number) => void pending.set(dra, id),
    getPending: async (dra: string) => {
      const id = pending.get(dra);
      if (!id) return null;
      const s = solicitudes.find((x) => x.id === id && x.estado === "esperando_dra");
      return s ? { solicitudId: s.id, waPhone: s.wa_phone } : null;
    },
    clearPending: async (dra: string) => void pending.delete(dra),
  };

  const audit = { log: async (event: string, data: Record<string, unknown>) => void audits.push({ event, data }) };
  const control = {
    isPaused: async (p: string) => paused.has(p) || paused.has("GLOBAL"),
    pause: async (s: string) => void paused.add(s),
    resume: async (s: string) => void paused.delete(s),
  };
  const roleStore = {
    inAllowlist: async () => opts.allow ?? null,
    getRole: async () => opts.saved ?? null,
    setRole: async (phone: string, role: Role) => void roleSet.push({ phone, role }),
    isPatient: async () => opts.isPatient ?? false,
  };
  const activity = { recordInbound: async () => {}, isWithin24h: async () => opts.within24h ?? true };
  const media = {
    transcribeAudio: async () => "audio transcrito",
    describeImage: async () => "imagen descrita",
  };
  const log = { debug() {}, info() {}, warn() {}, error() {} };

  // sirve como AgentDeps y como Container (props extra no molestan)
  const deps = {
    messaging,
    llm,
    crm: {},
    memory,
    agenda,
    solicitud,
    audit,
    control,
    roleStore,
    activity,
    media,
    log,
  } as never;

  return { deps, sent, lists, templates, audits, paused, solicitudes, pending, mem, roleSet };
}

export const noopLog = { debug() {}, info() {}, warn() {}, error() {} } as never;
