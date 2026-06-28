# Virtual Assistant — Medical (WhatsApp Cloud API)

Servicio dedicado (Node.js + TypeScript) que es el **cerebro conversacional** de un asistente de WhatsApp para un consultorio de medicina estética. Recibe mensajes vía **WhatsApp Cloud API (Meta)**, clasifica al interlocutor, corre un agente LLM por rol y responde.

## Principio de arquitectura

**Vertical-slice por rol (afuera) + Hexagonal / ports-adapters (núcleo).**

- Cada **rol** (`familiar`, `visitador`, `paciente`, `doctora-admin`) es una carpeta cerrada con su prompt + tools + memoria. **Un rol NO puede importar a otro** (lo fuerza ESLint `boundaries`). La información **no se cruza** — por estructura, no por instrucción al LLM.
- El **núcleo** depende de **puertos (interfaces)**, no de integraciones concretas. WhatsApp / LLM / Postgres / Redis son **adaptadores** intercambiables y mockeables.

## Dos procesos, un código

- `src/main/server.ts` → **webhook**: valida firma (HMAC), deduplica, ACK <1s, encola. No hace trabajo pesado.
- `src/main/worker.ts` → **worker** (BullMQ): rutea rol → corre agente → responde. Aquí vive el LLM.

```
WhatsApp Cloud API → server (webhook) → Redis/BullMQ → worker → LLM/tools → WhatsApp / Postgres
```

## Reglas de límites (enforced en CI)

| Módulo | Puede importar | NUNCA importa |
|---|---|---|
| `roles/<rol>` | `core`, `shared`, `platform/{logger,errors}` | **otro `roles/*`**, `integrations` |
| `core` | `core/ports`, `shared` | `roles`, `integrations` |
| `integrations` | `core/ports`, `shared`, `platform` | `roles`, lógica de `core` |
| `webhook`, `jobs` | `core`, `roles` (solo barrel), `platform` | — |
| `main` | todo (composition root) | — |
| `shared` | nada hacia arriba (hoja) | — |

## Stack

- **Runtime:** Node.js ≥ 20, TypeScript (ESM, NodeNext)
- **Web:** Fastify (webhook)
- **Cola:** BullMQ + Redis
- **DB:** PostgreSQL (migraciones forward-only, se aplican al boot)
- **LLM:** proveedor configurable vía adaptador
- **Mensajería:** WhatsApp Cloud API (Meta)

## Configuración

Copiar `.env.example` → `.env` y completar las variables (credenciales y endpoints). **Nunca** commitear `.env` ni secretos (ya están en `.gitignore`).

## Comandos

```bash
npm install
docker compose up -d   # postgres + redis local (desarrollo)
npm run dev:server     # webhook en local
npm run dev:worker     # worker en local
npm run migrate        # aplicar migraciones manualmente (también corren al boot)
npm run lint           # incluye boundaries (falla si un rol importa a otro)
npm test
npm run typecheck
```

## Despliegue

Dos procesos (`server` + `worker`) corren como contenedores junto a Postgres y Redis. Ver `DEPLOY.md` para detalles de infraestructura.
