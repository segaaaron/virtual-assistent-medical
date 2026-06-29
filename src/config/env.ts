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

  // Datos privados de la doctora (NUNCA hardcodeados ni commiteados; solo en .env).
  DOCTORA_PHONE: z.string().min(1), // numero personal de la Dra (allow-list + escalacion)
  DOCTORA_NAME: z.string().min(1), // nombre completo, ej. "Nombre Apellido"

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  DEBOUNCE_MS: z.coerce.number().default(9000),
  DEDUP_TTL_SECONDS: z.coerce.number().default(86400),

  // Modelo LLM (centralizado en env, no hardcodeado). Cambiable en Dokploy sin recompilar.
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // Gating (#QA-1): mientras el bot no este validado en vivo, solo responde a la doctora
  // y a los numeros de prueba. ON por defecto (seguro). Apagar con BOT_GATING=false al validar.
  BOT_GATING: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Lista separada por comas de numeros de prueba permitidos durante el gating (E.164 sin '+').
  TEST_PHONES: z
    .string()
    .default("59176944986")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
});

export type Env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line no-restricted-properties -- unico punto autorizado
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variables de entorno invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env: Env = parsed.data;
