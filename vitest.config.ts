import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Resuelve los alias @ y mapea imports ".js" -> ".ts" (estilo NodeNext) para los tests.
const aliases = ["config", "core", "platform", "roles", "integrations", "shared"].map((a) => ({
  find: new RegExp(`^@${a}/(.*)\\.js$`),
  replacement: resolve(__dirname, `src/${a}/$1.ts`),
}));

export default defineConfig({
  resolve: { alias: aliases },
  test: { environment: "node", include: ["test/**/*.test.ts"], setupFiles: ["./test/setup.ts"] },
});
