export function isStaff(userId) {
  return (process.env.STAFF_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .includes(userId);
}

export async function recordReview(
  sql,
  { actor, userId, kind, approved: decision, reason },
) {
  if (actor === userId) return false;
  const results = await sql.transaction((tx) => [
    tx`SELECT neon_user_id FROM farmers WHERE neon_user_id = ${userId} FOR UPDATE`,
    tx`INSERT INTO account_reviews (farmer_id, kind, approved, reviewed_by, reason, reviewed_value)
       SELECT neon_user_id, ${kind}, ${decision}, ${actor}, ${reason}, CASE WHEN ${kind}='identity' THEN gov_id_name || ':' || gov_id_value ELSE '' END
       FROM farmers WHERE neon_user_id = ${userId}
       ON CONFLICT (farmer_id, kind) DO UPDATE
       SET approved = EXCLUDED.approved, reviewed_by = EXCLUDED.reviewed_by,
           reason = EXCLUDED.reason, reviewed_value = EXCLUDED.reviewed_value, updated_at = now()
       RETURNING farmer_id`,
    tx`INSERT INTO account_review_events (farmer_id, kind, approved, reviewed_by, reason)
       SELECT neon_user_id, ${kind}, ${decision}, ${actor}, ${reason}
       FROM farmers WHERE neon_user_id = ${userId}`,
  ]);
  return results[1].length === 1;
}
