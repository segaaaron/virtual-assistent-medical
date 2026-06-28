import type { AgentDeps, RoleAgent } from "@core/types/agent.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Logger } from "@shared/logger.js";
import type { Phone } from "@core/types/role.js";
import { maskPhone } from "@shared/pii.js";
import { env } from "@config/env.js";

// Nombre de pila de la doctora desde env (privado, NUNCA hardcodeado).
const doctoraFirstName = env.DOCTORA_NAME.split(" ")[0] ?? env.DOCTORA_NAME;

// Relays canned a la visitadora (sutiles, educados, trato de usted). 7 opciones (lista interactiva).
const RELAYS: Record<string, string> = {
  PASE: `¡Con gusto! 🌷 La Dra. ${doctoraFirstName} puede recibirle ahora; puede pasar cuando guste. Que tenga una excelente visita.`,
  NO: `Le agradecemos mucho su amable visita 🌷. Por hoy a la Dra. ${doctoraFirstName} no le sera posible recibirle; con todo gusto coordinamos otra fecha a su conveniencia.`,
  TARDE: `La Dra. ${doctoraFirstName} le agradece su amable visita 🌷. ¿Le seria posible volver en la tarde? Le atenderia con gusto.`,
  MANANA: `La Dra. ${doctoraFirstName} le agradece su amable visita 🌷. ¿Le seria posible volver en la mañana? Le atenderia con gusto.`,
  ESPERA: `Un momento por favor 🌷, la Dra. ${doctoraFirstName} le atiende en seguida. Gracias por su amable paciencia.`,
  OTRODIA: "Le agradecemos su gentileza 🌷. Con gusto coordinamos otro dia a su conveniencia; ¿que dia le viene mejor?",
};

// Agente ADMIN (la Dra). Responde visitas (7 opciones/relay) + comandos. Acciones criticas deterministicas.
export function createDoctoraAgent(deps: AgentDeps): RoleAgent {
  return {
    async handle(message: InboundMessage, log: Logger): Promise<void> {
      const phone = message.from as Phone;
      const text = message.text.trim();

      // 1) La Dra eligio una opcion de un aviso de visita -> relay atribuido a esa solicitud exacta.
      if (message.replyToId && message.buttonPayload) {
        const sol = await deps.solicitud.findByAvisoMsgId(message.replyToId);
        if (!sol) {
          await deps.messaging.sendText({
            to: phone,
            text: "Esa solicitud ya fue atendida, doctora 🌷. Quedo atenta para lo que necesite.",
          });
          return;
        }
        const action = message.buttonPayload;
        if (action === "YO") {
          await deps.solicitud.setPending(message.from, sol.id);
          await deps.messaging.sendText({
            to: phone,
            text: "Con gusto, doctora 🌷. Escribame el mensaje que desea enviarle y se lo hare llegar de inmediato.",
          });
          return;
        }
        const relay = RELAYS[action];
        if (relay) {
          await deps.messaging.sendText({ to: sol.wa_phone as Phone, text: relay });
          await deps.solicitud.markResponded(sol.id);
          await deps.audit.log("relay_visita", { solicitud: sol.id, action });
          await deps.messaging.sendText({ to: phone, text: "Listo, doctora 🌷. Le transmiti con cortesia." });
          return;
        }
      }

      // 2) La Dra escribe libre y hay una respuesta pendiente -> relay atribuido + cierra.
      if (!message.buttonPayload) {
        const pend = await deps.solicitud.getPending(message.from);
        if (pend) {
          await deps.messaging.sendText({
            to: pend.waPhone as Phone,
            text: `La Dra. ${doctoraFirstName} le hace llegar el siguiente mensaje: «${text}»`,
          });
          await deps.solicitud.markResponded(pend.solicitudId);
          await deps.solicitud.clearPending(message.from);
          await deps.audit.log("relay_visita_libre", { solicitud: pend.solicitudId });
          await deps.messaging.sendText({ to: phone, text: "Listo, doctora 🌷. Se lo hice llegar." });
          return;
        }
      }

      // 3) Comandos deterministicos de control (escriben en bot_control).
      if (/^#pausa-total/i.test(text)) {
        await deps.control.pause("GLOBAL");
        await deps.audit.log("comando_pausa_total", { by: maskPhone(message.from) });
        await deps.messaging.sendText({ to: phone, text: "✋ Bot pausado en todos los chats. (#sigue-total para reactivar)" });
        return;
      }
      if (/^#sigue-total/i.test(text)) {
        await deps.control.resume("GLOBAL");
        await deps.audit.log("comando_sigue_total", { by: maskPhone(message.from) });
        await deps.messaging.sendText({ to: phone, text: "▶️ Bot reactivado en todos los chats." });
        return;
      }
      let mp: RegExpMatchArray | null;
      if ((mp = text.match(/^#pausa\s+\+?(\d{6,})/i))) {
        await deps.control.pause(mp[1]!);
        await deps.messaging.sendText({ to: phone, text: `✋ Bot pausado para ${mp[1]}. (#sigue ${mp[1]} para reactivar)` });
        return;
      }
      if ((mp = text.match(/^#sigue\s+\+?(\d{6,})/i))) {
        await deps.control.resume(mp[1]!);
        await deps.messaging.sendText({ to: phone, text: `▶️ Bot reactivado para ${mp[1]}.` });
        return;
      }

      // 4) Resto: asistencia admin. (TODO: ver agenda, cambiar rol)
      await deps.audit.log("admin_msg", { by: maskPhone(message.from) });
      await deps.messaging.sendText({ to: phone, text: "A sus ordenes, doctora 🌷. ¿En que le ayudo?" });
      log.info({}, "doctora atendida");
    },
  };
}
