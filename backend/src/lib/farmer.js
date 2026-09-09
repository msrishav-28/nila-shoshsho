import { decryptGovId } from "./pii.js";

export function toUser(row, accessToken) {
  const user = {
    _id: row.neon_user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    gender: row.gender,
    profilePic: row.profile_pic || "",
    dob: row.dob,
    age: row.age,
    location: {
      address: row.address || "",
      lat: Number(row.lat) || 0,
      lon: Number(row.lon) || 0,
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      pincode: row.pincode || "",
    },
    governmentId: {
      idName: row.gov_id_name || "",
      idValue: decryptGovId(row.gov_id_value || ""),
    },
    languageSpoken: row.language_spoken || [],
    bio: row.bio || "",
    socialLinks: {
      facebook: row.facebook || "",
      instagram: row.instagram || "",
    },
    documents: row.documents || [],
    isVerified: Boolean(row.is_verified),
  };
  if (accessToken) {
    user.accessToken = accessToken;
  }
  return user;
}

export async function getFarmerByNeonId(sql, neonUserId) {
  const rows = await sql`
    SELECT * FROM farmers WHERE neon_user_id = ${neonUserId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function getFarmerByEmail(sql, email) {
  const rows = await sql`
    SELECT * FROM farmers WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `;
  return rows[0] || null;
}
