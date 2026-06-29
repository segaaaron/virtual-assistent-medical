// Env dummy para tests (evita que @config/env haga process.exit por faltantes).
const defaults: Record<string, string> = {
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_TOKEN: "t",
  WHATSAPP_APP_SECRET: "s",
  WHATSAPP_VERIFY_TOKEN: "v",
  OPENAI_API_KEY: "k",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  DOCTORA_PHONE: "59100000000",
  DOCTORA_NAME: "Doctora Demo",
  NODE_ENV: "test",
  // Gating apagado en tests de flujo (usan numeros arbitrarios). El gating se prueba
  // aparte con la funcion pura isGated() en test/unit. En produccion BOT_GATING=true.
  BOT_GATING: "false",
};
for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
