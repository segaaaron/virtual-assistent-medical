// Unico lugar que lee process.env. Valida con zod al boot y falla rapido si falta algo.
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_GRAPH_VERSION: z.string().default("v21.0"),

  OPENAI_API_KEY: z.string().min(1),

  CHATWOOT_BASE_URL: z.string().url(),
  CHATWOOT_API_TOKEN: z.string().min(1),

  // Datos privados de la doctora (NUNCA hardcodeados ni commiteados; solo en .env).
  DOCTORA_PHONE: z.string().min(1), // numero personal de la Dra (allow-list + escalacion)
  DOCTORA_NAME: z.string().min(1), // nombre completo, ej. "Nombre Apellido"

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  DEBOUNCE_MS: z.coerce.number().default(9000),
  DEDUP_TTL_SECONDS: z.coerce.number().default(86400),
});

export type Env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line no-restricted-properties -- unico punto autorizado
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variables de entorno invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env: Env = parsed.data;
