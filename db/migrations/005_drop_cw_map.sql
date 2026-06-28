-- Chatwoot eliminado de la infraestructura: el bot corre directo sobre WhatsApp Cloud API.
-- Limpia la tabla muerta del espejo (mapeo wa_phone -> conversacion Chatwoot). Forward-only.
DROP TABLE IF EXISTS cw_conversation_map;
