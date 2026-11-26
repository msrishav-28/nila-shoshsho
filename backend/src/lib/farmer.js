import { decryptGovId } from "./pii.js";
import { documentLinks, profileLink } from "./privateFiles.js";

export function maskGovId(plain) {
  const text = String(plain || "");
  if (!text) {
    return "";
  }
  if (text.length <= 4) {
    return "****";
  }
  return "*".repeat(text.length - 4) + text.slice(-4);
}

export function isMaskedGovId(value) {
  return /^\*+[A-Za-z0-9]{0,4}$/.test(String(value || "").trim());
}

export function toUser(row, accessToken) {
  const user = {
    _id: row.neon_user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    carrierApproved: row.carrier_approved === true,
    profileVersion: Number(row.profile_version || 0),
    gender: row.gender,
    profilePic: profileLink(row.profile_pic),
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
      idValue: maskGovId(decryptGovId(row.gov_id_value || "")),
    },
    languageSpoken: row.language_spoken || [],
    bio: row.bio || "",
    socialLinks: {
      facebook: row.facebook || "",
      instagram: row.instagram || "",
    },
    documents: documentLinks(row.documents || []),
    documentLinksExpireInSeconds: 300,
    isVerified: row.identity_approved === true,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
  if (accessToken) {
    user.accessToken = accessToken;
  }
  return user;
}

export async function getFarmerByNeonId(sql, neonUserId) {
  const rows = await sql`
    SELECT f.*,
      EXISTS (SELECT 1 FROM account_reviews r WHERE r.farmer_id=f.neon_user_id AND r.kind='carrier' AND r.approved) AS carrier_approved,
      EXISTS (SELECT 1 FROM account_reviews r WHERE r.farmer_id=f.neon_user_id AND r.kind='identity' AND r.approved
        AND r.reviewed_value=f.gov_id_name || ':' || f.gov_id_value AND f.gov_id_name<>'' AND f.gov_id_value LIKE 'enc:v1:%') AS identity_approved
    FROM farmers f WHERE neon_user_id = ${neonUserId} LIMIT 1
  `;
  return rows[0] || null;
}

export async function getFarmerByEmail(sql, email) {
  const rows = await sql`
    SELECT * FROM farmers WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `;
  return rows[0] || null;
}
