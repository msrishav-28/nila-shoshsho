import "../src/lib/env.js";
import { getSql } from "../src/lib/db.js";
import cloudinary from "../src/lib/cloudinary.js";

if (!process.argv.includes("--confirm")) {
  console.error(
    "Pass --confirm to remove up to 20 unlinked uploads older than one hour.",
  );
  process.exitCode = 1;
} else {
  try {
    const sql = getSql();
    await sql`DELETE FROM revoked_tokens WHERE token_hash IN
              (SELECT token_hash FROM revoked_tokens WHERE expires_at < now() ORDER BY expires_at LIMIT 2000)`;
    await sql`DELETE FROM account_sessions WHERE token_hash IN
              (SELECT token_hash FROM account_sessions WHERE expires_at < now() ORDER BY expires_at LIMIT 2000)`;
    const rows =
      await sql`SELECT * FROM pending_uploads WHERE created_at < now()-interval '1 hour'
                           ORDER BY created_at LIMIT 20`;
    for (const row of rows) {
      const result = await cloudinary.uploader.destroy(row.public_id, {
        resource_type: row.resource_type,
        type: row.delivery_type,
        timeout: 15000,
      });
      if (!["ok", "not found"].includes(result.result))
        throw new Error("Storage cleanup rejected");
      await sql`DELETE FROM pending_uploads WHERE public_id=${row.public_id}`;
    }
    console.info("Unlinked upload cleanup completed.");
  } catch {
    console.error(
      "Upload cleanup incomplete. Pending records remain available for retry.",
    );
    process.exitCode = 1;
  }
}
