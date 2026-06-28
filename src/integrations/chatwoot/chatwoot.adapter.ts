import type { Env } from "@config/env.js";
import type { CrmPort } from "@core/ports/crm.port.js";
import type { CwMapStore } from "@core/ports/cw-map.port.js";
import { CHATWOOT_WHATSAPP_INBOX_ID } from "@config/constants.js";
import { IntegrationError } from "@platform/errors/index.js";

// Respuestas parciales de la Cloud API que nos interesan (parse defensivo).
interface CwContactPayload {
  payload?: {
    contact?: { id?: number; contact_inboxes?: { source_id?: string; inbox?: { id?: number } }[] };
    contact_inbox?: { source_id?: string };
  };
}
interface CwSearchPayload {
  payload?: { id?: number }[];
}
interface CwContactInboxPayload {
  source_id?: string;
  payload?: { source_id?: string; inbox?: { id?: number } }[];
}
interface CwConversationPayload {
  id?: number;
}

// Adaptador Chatwoot -> implementa CrmPort. Handoff via status pending<->open.
// ensureConversation espeja TODA charla de paciente/visitador/familiar en el inbox de la Dra.
export function createChatwootAdapter(env: Env, map: CwMapStore): CrmPort {
  const headers = { api_access_token: env.CHATWOOT_API_TOKEN, "Content-Type": "application/json" };
  const base = env.CHATWOOT_BASE_URL;
  const inboxId = CHATWOOT_WHATSAPP_INBOX_ID;

  async function post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new IntegrationError(`Chatwoot ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  async function reqJson<T>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: T }> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: unknown = undefined;
    const raw = await res.text();
    try {
      json = raw ? JSON.parse(raw) : undefined;
    } catch {
      json = undefined;
    }
    return { ok: res.ok, status: res.status, json: json as T };
  }

  // E.164 con '+'. message.from viene SIN '+' (solo digitos).
  function e164(phone: string): string {
    return phone.startsWith("+") ? phone : `+${phone}`;
  }

  // Resuelve un contact_inbox (source_id) para un contacto ya existente en el inbox WhatsApp.
  async function resolveSourceId(contactId: number): Promise<string> {
    // intenta crear el contact_inbox (idempotente: si existe, Chatwoot devuelve el existente o 422).
    const created = await reqJson<CwContactInboxPayload>("POST", `/contacts/${contactId}/contact_inboxes`, {
      inbox_id: inboxId,
    });
    if (created.ok && created.json?.source_id) return created.json.source_id;

    // fallback: lista los inboxes contactables y toma el del inbox WhatsApp.
    const inboxes = await reqJson<CwContactInboxPayload>("GET", `/contacts/${contactId}/contactable_inboxes`);
    const match = inboxes.json?.payload?.find((p) => p.inbox?.id === inboxId);
    if (match?.source_id) return match.source_id;

    throw new IntegrationError(`Chatwoot sin source_id para contacto ${contactId} en inbox ${inboxId}`);
  }

  // find-or-create contacto y devuelve {contactId, sourceId} en el inbox WhatsApp.
  async function findOrCreateContact(phone: string, name?: string): Promise<{ contactId: number; sourceId: string }> {
    const created = await reqJson<CwContactPayload>("POST", "/contacts", {
      inbox_id: inboxId,
      name: name ?? e164(phone),
      phone_number: e164(phone),
    });
    if (created.ok) {
      const contact = created.json?.payload?.contact;
      const contactId = contact?.id;
      const sourceId =
        created.json?.payload?.contact_inbox?.source_id ??
        contact?.contact_inboxes?.find((ci) => ci.inbox?.id === inboxId)?.source_id ??
        contact?.contact_inboxes?.[0]?.source_id;
      if (contactId && sourceId) return { contactId, sourceId };
      if (contactId) return { contactId, sourceId: await resolveSourceId(contactId) };
    }

    // ya existe (p.ej. 422 "phone has already been taken") -> busca por telefono.
    const search = await reqJson<CwSearchPayload>("GET", `/contacts/search?q=${encodeURIComponent(e164(phone))}`);
    const contactId = search.json?.payload?.[0]?.id;
    if (!contactId) {
      throw new IntegrationError(`Chatwoot no pudo crear ni encontrar contacto para ${e164(phone)}`);
    }
    return { contactId, sourceId: await resolveSourceId(contactId) };
  }

  return {
    async ensureConversation(phone: string, name?: string): Promise<number> {
      const existing = await map.get(phone);
      if (existing) return existing;

      const { contactId, sourceId } = await findOrCreateContact(phone, name);
      const conv = await reqJson<CwConversationPayload>("POST", "/conversations", {
        source_id: sourceId,
        inbox_id: inboxId,
        contact_id: contactId,
      });
      const conversationId = conv.json?.id;
      if (!conv.ok || !conversationId) {
        throw new IntegrationError(`Chatwoot no pudo crear conversacion para contacto ${contactId} (${conv.status})`);
      }
      await map.set(phone, conversationId);
      return conversationId;
    },
    async postIncoming(conversationId, text): Promise<void> {
      await post(`/conversations/${conversationId}/messages`, { content: text, message_type: "incoming" });
    },
    async postReply(conversationId, text): Promise<void> {
      await post(`/conversations/${conversationId}/messages`, { content: text, message_type: "outgoing" });
    },
    async postPrivateNote(conversationId, text): Promise<void> {
      await post(`/conversations/${conversationId}/messages`, { content: text, message_type: "outgoing", private: true });
    },
    async handoffToHuman(conversationId): Promise<void> {
      await post(`/conversations/${conversationId}/toggle_status`, { status: "open" });
    },
    async returnToBot(conversationId): Promise<void> {
      await post(`/conversations/${conversationId}/toggle_status`, { status: "pending" });
    },
  };
}
