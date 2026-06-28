import pg from "pg";
import { env } from "@config/env.js";

// Pool de Postgres singleton.
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}
