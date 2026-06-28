// Env dummy para tests (evita que @config/env haga process.exit por faltantes).
const defaults: Record<string, string> = {
  WHATSAPP_PHONE_NUMBER_ID: "123",
  WHATSAPP_TOKEN: "t",
  WHATSAPP_APP_SECRET: "s",
  WHATSAPP_VERIFY_TOKEN: "v",
  OPENAI_API_KEY: "k",
  CHATWOOT_BASE_URL: "https://x.test/api/v1/accounts/1",
  CHATWOOT_API_TOKEN: "c",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  DOCTORA_PHONE: "59100000000",
  DOCTORA_NAME: "Doctora Demo",
  NODE_ENV: "test",
};
for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
