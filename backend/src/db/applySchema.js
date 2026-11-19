import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../lib/env.js";
import { pathToFileURL } from "url";
import { getSql } from "../lib/db.js";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function applySchema(sql) {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const statements = schema
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  await sql.transaction(statements.map((statement) => sql.query(statement)));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  applySchema(migrationUrl ? neon(migrationUrl) : getSql())
    .then(() => {
      console.log("Farmer tables are ready.");
    })
    .catch(() => {
      console.error("Database setup failed. The transaction was rolled back.");
      process.exitCode = 1;
    });
}
