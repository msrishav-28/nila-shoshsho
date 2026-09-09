import { neon } from "@neondatabase/serverless";

let sql;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function assertDb() {
  const client = getSql();
  await client`SELECT 1`;
}
