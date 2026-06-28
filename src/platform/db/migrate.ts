// Runner de migraciones con TRACKING. Aplica solo los .sql nuevos, UNA vez, en transaccion.
// Seguro entre procesos (advisory lock) -> se puede llamar en el arranque de cada deploy.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./index.js";
import { logger } from "../logger/index.js";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../db/migrations");
const LOCK_KEY = 918273645; // clave fija para pg_advisory_lock (serializa migraciones concurrentes)

// Devuelve los nombres de las migraciones aplicadas en esta corrida.
export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  const ran: string[] = [];
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    const applied = new Set(
      (await client.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
    );
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran.push(file);
        logger.info({ file }, "migracion aplicada");
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error({ file, err }, "migracion fallo (rollback)");
        throw err;
      }
    }
    return ran;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
