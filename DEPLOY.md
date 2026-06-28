# Despliegue — Loreley Brain

El servicio corre como **2 procesos** (server + worker) sobre **PostgreSQL** y **Redis**.
Toda la configuración (incluidos los datos privados) vive en `.env` y **nunca** se commitea.

## 1. Variables de entorno (`.env`)
Copiar `.env.example` a `.env` y completar. Validadas con zod al boot: si falta una, el proceso
no arranca (fail-fast). Claves principales:

- WhatsApp Cloud API: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN` (lo eliges tú; el mismo se pega al suscribir el webhook en Meta),
  `WHATSAPP_GRAPH_VERSION`.
- `OPENAI_API_KEY`.
- `DATABASE_URL` (Postgres) y `REDIS_URL` (Redis para la cola BullMQ).
- Datos privados de la doctora: `DOCTORA_PHONE` (número personal, allow-list + escalación) y
  `DOCTORA_NAME` (nombre completo, se interpola en los prompts y respuestas). **Solo en `.env`.**

## 2. Infraestructura
```bash
# Postgres (si no tienes uno)
docker run -d --name loreley-postgres --restart unless-stopped \
  -e POSTGRES_DB=loreley -e POSTGRES_USER=loreley -e POSTGRES_PASSWORD=<password> \
  -p 5432:5432 postgres:16

# Redis (cola BullMQ)
docker run -d --name loreley-redis --restart unless-stopped -p 6379:6379 redis:7
```

## 3. Migraciones (automáticas al arrancar)
```bash
npm install
```
Las migraciones se aplican **solas al arrancar el server** (`runMigrations()` en el boot):
- Aplica solo los `.sql` **nuevos** de `db/migrations/`, una vez, en transacción, con tracking en
  `schema_migrations`.
- Seguro entre procesos (advisory lock). Si una migración falla → el server NO arranca.
- También manual: `npm run migrate`.

**Flujo de cambios de schema** (forward-only):
1. Agregar un archivo nuevo numerado `db/migrations/00X_nombre.sql` (nunca editar uno ya aplicado).
2. Commit + push.
3. El deploy reinicia el server → aplica las migraciones pendientes en PROD automáticamente.

## 4. Arrancar los 2 procesos
```bash
npm run start:server   # webhook (puerto 3000)
npm run start:worker   # worker (procesa la cola)
```
En prod: PM2 o 2 servicios (Dokploy/compose). Corren con tsx, no necesitan build.

## 5. Conectar el webhook en Meta
- URL: `https://<tu-dominio>/webhook` (detrás de un reverse proxy con HTTPS).
- Verify token: el `WHATSAPP_VERIFY_TOKEN` del `.env`.
- Suscribir el campo **messages** de la WABA.

## Notas
- Allow-list de la doctora: se resuelve por `DOCTORA_PHONE`. Familiares: agregar en
  `FAMILIAR_PHONES` (`src/config/constants.ts`) si hace falta.
- Pacientes: insertar en la tabla `pacientes` los conocidos (o dejar que el clasificador los detecte).
- Agenda usa franjas stub (TODO: horario real). Booking ya es anti-doble-reserva.
- Validar en vivo antes de abrir a pacientes reales.
