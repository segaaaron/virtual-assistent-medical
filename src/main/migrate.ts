// CLI de migraciones: `npm run migrate`. (Tambien corre solo en el arranque del server.)
import { runMigrations } from "@platform/db/migrate.js";
import { pool } from "@platform/db/index.js";
import { logger } from "@platform/logger/index.js";

runMigrations()
  .then(async (ran) => {
    logger.info({ count: ran.length, ran }, ran.length ? "migraciones aplicadas" : "sin migraciones pendientes");
    await pool.end();
  })
  .catch(async (err) => {
    logger.error({ err }, "migrate fallo");
    await pool.end().catch(() => {});
    process.exit(1);
  });
