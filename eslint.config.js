// Enforcement de límites de módulos (hexagonal + vertical-slice).
// REGLA CLAVE: un rol NUNCA importa a otro rol -> la info no se cruza, por ESTRUCTURA.
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { project: "./tsconfig.json" },
  },
  plugins: { boundaries },
  settings: {
    // los patrones mas especificos van primero (logger/errors antes que platform/*)
    "boundaries/elements": [
      { type: "main", pattern: "src/main/*" },
      { type: "config", pattern: "src/config/*" },
      { type: "platform-logger", pattern: "src/platform/logger/*" },
      { type: "platform-errors", pattern: "src/platform/errors/*" },
      { type: "platform", pattern: "src/platform/*" },
      { type: "webhook", pattern: "src/webhook/*" },
      { type: "jobs", pattern: "src/jobs/*" },
      { type: "core", pattern: "src/core/**" },
      { type: "role", pattern: "src/roles/*", capture: ["role"] },
      { type: "integration", pattern: "src/integrations/*" },
      { type: "shared", pattern: "src/shared/*" },
    ],
    "import/resolver": { typescript: { project: "./tsconfig.json" } },
  },
  rules: {
    "boundaries/no-unknown": "off",
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: "main", allow: ["*"] },
          // un rol: dominio + shared + config + SOLO logger/errors (NO db/queue), y solo a si mismo
          {
            from: "role",
            allow: ["core", "shared", "config", "platform-logger", "platform-errors", ["role", { role: "${from.role}" }]],
          },
          { from: "core", allow: ["core", "shared"] },
          { from: "integration", allow: ["core", "shared", "config", "platform", "platform-logger", "platform-errors"] },
          { from: "webhook", allow: ["core", "shared", "config", "platform", "platform-logger", "platform-errors"] },
          { from: "jobs", allow: ["core", "role", "shared", "config", "platform", "platform-logger", "platform-errors"] },
          { from: "platform", allow: ["platform", "shared", "config", "platform-logger", "platform-errors"] },
          { from: "platform-logger", allow: ["shared", "config"] },
          { from: "platform-errors", allow: ["shared"] },
          { from: "config", allow: ["shared"] },
          { from: "shared", allow: [] },
        ],
      },
    ],
    "no-restricted-properties": [
      "error",
      { object: "process", property: "env", message: "Usa @config/env (validado con zod), no process.env directo." },
    ],
  },
});
