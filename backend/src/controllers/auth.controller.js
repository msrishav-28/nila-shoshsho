import { getSql } from "../lib/db.js";
import {
  profileImage,
  PRIVATE_PREFIX,
  AUTHENTICATED_PREFIX,
} from "../lib/privateFiles.js";
import { uploadAsset } from "../lib/uploadAsset.js";
import {
  getFarmerByEmail,
  getFarmerByNeonId,
  isMaskedGovId,
  toUser,
} from "../lib/farmer.js";
import {
  extractAccessToken,
  extractAuthUser,
  neonChangePassword,
  neonSignIn,
  neonSignOut,
  neonSignUp,
} from "../lib/neonAuth.js";
import { readBearer } from "../lib/bearer.js";
import { verifyAccessToken } from "../lib/verifyToken.js";
import { isRevoked } from "../lib/revocation.js";
import {
  closeOtherSessions,
  closeSession,
  getSessionCookie,
  saveSession,
} from "../lib/accountSession.js";
import { encryptGovId } from "../lib/pii.js";

const ALLOWED_ROLES = ["Farmer", "Logistics"];
const ALLOWED_GENDERS = ["Male", "Female", "Other"];
const ALLOWED_LANGUAGES = [
  "Hindi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Gujarati",
  "Malayalam",
  "Kannada",
  "Punjabi",
  "Assamese",
  "English",
];

function authErrorMessage(payload, fallback) {
  const message = payload?.message || payload?.error?.message;
  return typeof message === "string" && message.length <= 200
    ? message
    : fallback;
}

function authFailure(res, status, message) {
  if (status === 429)
    return res.status(429).json({
      success: false,
      message: "Sign-in service is busy. Please retry later.",
    });
  if (status >= 500)
    return res
      .status(502)
      .json({ success: false, message: "Sign-in service unavailable" });
  return res.status(400).json({ success: false, message });
}

export const signup = async (req, res) => {
  const { username, email, password, role, gender } = req.body;

  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    username.length > 100 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length > 128 ||
    !role ||
    !gender
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }
  if (!ALLOWED_ROLES.includes(role) || !ALLOWED_GENDERS.includes(gender)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid role or gender" });
  }

  const sql = getSql();
  try {
    if (await getFarmerByEmail(sql, email)) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the given email",
      });
    }

    let { ok, payload, status, sessionCookie } = await neonSignUp({
      email,
      password,
      name: username,
    });
    if (!ok) {
      if (![400, 409, 422].includes(status))
        return authFailure(res, status, "Could not create account");
      const retry = await neonSignIn({ email, password });
      if (!retry.ok) {
        return authFailure(res, retry.status, "Could not create account");
      }
      payload = retry.payload;
      sessionCookie = retry.sessionCookie;
    }

    const accessToken = extractAccessToken(payload);
    const authUser = extractAuthUser(payload);
    const neonUserId = authUser?.id;
    if (!accessToken || !neonUserId) {
      return res.status(502).json({
        success: false,
        message: "Sign-in service did not return a session",
      });
    }
    let identity;
    try {
      identity = await verifyAccessToken(accessToken);
      if (identity.neonUserId !== neonUserId)
        throw new Error("Identity mismatch");
    } catch {
      return res.status(502).json({
        success: false,
        message: "Sign-in service did not return a valid access token",
      });
    }

    await sql.transaction(
      (tx) => [
        tx`INSERT INTO farmers (neon_user_id, email, phone_no, username, role, gender)
         VALUES (${neonUserId}, ${email.trim().toLowerCase()}, '', ${username.trim()}, ${role}, ${gender})
         ON CONFLICT (neon_user_id) DO NOTHING`,
        tx`SELECT neon_user_id FROM farmers WHERE neon_user_id = ${neonUserId} FOR UPDATE`,
        tx`INSERT INTO notifications (farmer_id, title, body)
         SELECT ${neonUserId}::uuid, 'Welcome to Nila Shoshsho',
           'Your account is ready. Weather, schemes, and crop tools are on Home.'
         WHERE NOT EXISTS (SELECT 1 FROM notifications
           WHERE farmer_id = ${neonUserId} AND title = 'Welcome to Nila Shoshsho')`,
      ],
      { isolationLevel: "ReadCommitted" },
    );
    const farmer = await getFarmerByNeonId(sql, neonUserId);
    if (!farmer) throw new Error("Account creation incomplete");
    await saveSession(
      sql,
      accessToken,
      identity.neonUserId,
      identity.payload.exp,
      sessionCookie,
    );

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: toUser(farmer, accessToken),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

async function completeLogin(res, email, password) {
  const { ok, payload, status, sessionCookie } = await neonSignIn({
    email,
    password,
  });
  if (!ok) {
    if (status >= 500 || status === 429)
      return authFailure(res, status, "Could not sign in");
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
  const accessToken = extractAccessToken(payload);
  const authUser = extractAuthUser(payload);
  if (!accessToken || !authUser?.id) {
    return res.status(502).json({
      success: false,
      message: "Sign-in service did not return a session",
    });
  }
  let identity;
  try {
    identity = await verifyAccessToken(accessToken);
    if (identity.neonUserId !== authUser.id)
      throw new Error("Identity mismatch");
  } catch {
    return res.status(502).json({
      success: false,
      message: "Sign-in service did not return a valid access token",
    });
  }
  const farmer = await getFarmerByNeonId(getSql(), authUser.id);
  if (!farmer) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
  await saveSession(
    getSql(),
    accessToken,
    identity.neonUserId,
    identity.payload.exp,
    sessionCookie,
  );
  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: toUser(farmer, accessToken),
  });
}

export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 128 ||
    !email ||
    !password
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }
  try {
    return await completeLogin(res, email, password);
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  const token = readBearer(req);
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Sign-in token required" });
  try {
    const identity = await verifyAccessToken(token);
    const sql = getSql();
    if (await isRevoked(sql, token)) {
      return res.json({ success: true, message: "Logout successful" });
    }
    const cookie = await getSessionCookie(sql, token, identity.neonUserId);
    if (!cookie) {
      // A session issued outside the account API cannot be closed upstream here.
      await closeSession(sql, token, identity.payload.exp);
      return res.json({ success: true, message: "Logout successful" });
    }
    const result = await neonSignOut({ cookie });
    if (!result.ok) {
      return res
        .status(502)
        .json({ success: false, message: "Session could not be ended" });
    }
    await closeSession(sql, token, identity.payload.exp);
  } catch (error) {
    if (error.status === 401)
      return res
        .status(401)
        .json({ success: false, message: "Invalid session" });
    return res
      .status(502)
      .json({ success: false, message: "Sign-out service unavailable" });
  }
  return res.status(200).json({ success: true, message: "Logout successful" });
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: toUser(req.user, req.accessToken),
  });
};

export const getProfileCompletion = async (req, res) => {
  try {
    const user = req.user;
    const fields = [
      user.email,
      user.username,
      user.gender,
      user.dob,
      user.age,
      user.profile_pic,
      user.address,
      user.lat !== 0 ? user.lat : null,
      user.lon !== 0 ? user.lon : null,
      user.city,
      user.state,
      user.country,
      user.pincode,
      user.gov_id_name,
      user.gov_id_value,
      user.language_spoken?.length > 0 ? "filled" : null,
      user.bio,
      user.facebook,
      user.instagram,
    ];
    const filled = fields.filter(
      (f) => f !== undefined && f !== null && f !== "",
    ).length;
    const percentage = Math.round((filled / fields.length) * 100);
    return res.json({
      success: true,
      percentage,
      filledFields: filled,
      totalFields: fields.length,
      message: `Your profile is ${percentage}% complete`,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const sql = getSql();
    const userId = req.user.neon_user_id;
    const {
      username,
      role,
      gender,
      bio,
      dob,
      location,
      governmentId,
      socialLinks,
      languageSpoken,
    } = req.body;

    const current = await getFarmerByNeonId(sql, userId);
    if (!current) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let nextUsername = current.username;
    if (
      req.body.profileVersion !== undefined &&
      req.body.profileVersion !== Number(current.profile_version)
    ) {
      return res.status(409).json({
        success: false,
        message: "Profile changed. Reload it and retry.",
      });
    }
    let nextGender = current.gender;
    let nextBio = current.bio;
    let nextDob = current.dob;
    let nextAge = current.age;
    let nextAddress = current.address;
    let nextLat = current.lat;
    let nextLon = current.lon;
    let nextCity = current.city;
    let nextState = current.state;
    let nextCountry = current.country;
    let nextPincode = current.pincode;
    let nextGovName = current.gov_id_name;
    let nextGovValue = current.gov_id_value;
    let nextFacebook = current.facebook;
    let nextInstagram = current.instagram;
    let nextLanguages = current.language_spoken;

    if (username) {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Username cannot be less than 3 characters",
        });
      }
      nextUsername = trimmed;
    }
    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role" });
      }
      if (role !== current.role) {
        return res.status(403).json({
          success: false,
          message: "Account role changes require staff assistance",
        });
      }
    }
    if (gender) {
      if (!ALLOWED_GENDERS.includes(gender)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid gender" });
      }
      nextGender = gender;
    }
    if (bio !== undefined) {
      const trimmedBio = String(bio).trim();
      if (trimmedBio.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 500 characters",
        });
      }
      nextBio = trimmedBio;
    }
    if (dob === "") {
      nextDob = null;
      nextAge = null;
    } else if (dob) {
      const parsedDate = new Date(String(dob).trim());
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for DOB. Use YYYY-MM-DD",
        });
      }
      nextDob = parsedDate.toISOString().slice(0, 10);
      const today = new Date();
      let age = today.getFullYear() - parsedDate.getFullYear();
      const monthDiff = today.getMonth() - parsedDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < parsedDate.getDate())
      ) {
        age -= 1;
      }
      nextAge = age;
    }
    if (location) {
      nextAddress =
        location.address !== undefined
          ? location.address.trim()
          : current.address;
      nextCity =
        location.city !== undefined ? location.city.trim() : current.city;
      nextState =
        location.state !== undefined ? location.state.trim() : current.state;
      nextCountry =
        location.country !== undefined
          ? location.country.trim()
          : current.country;
      nextPincode =
        location.pincode !== undefined
          ? location.pincode.trim()
          : current.pincode;
      if (location.lat !== undefined) nextLat = location.lat;
      if (location.lon !== undefined) nextLon = location.lon;
      if (nextPincode && !/^\d{5,10}$/.test(nextPincode)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid pincode format" });
      }
    }
    const incomingGovValue = governmentId?.idValue?.trim() || "";
    const keepCurrentGov =
      governmentId?.idValue === undefined || isMaskedGovId(incomingGovValue);
    const govIdPlain = keepCurrentGov ? null : incomingGovValue;
    if (governmentId?.idValue !== undefined && !keepCurrentGov) {
      nextGovName = governmentId.idName?.trim() || "";
      nextGovValue = encryptGovId(govIdPlain);
    } else if (governmentId && governmentId.idName !== undefined) {
      nextGovName = governmentId.idName?.trim() || nextGovName;
    }
    if (socialLinks) {
      nextFacebook =
        socialLinks.facebook !== undefined
          ? socialLinks.facebook.trim()
          : current.facebook;
      nextInstagram =
        socialLinks.instagram !== undefined
          ? socialLinks.instagram.trim()
          : current.instagram;
    }
    if (languageSpoken) {
      if (!Array.isArray(languageSpoken)) {
        return res.status(400).json({
          success: false,
          message: "Languages spoken must be an array",
        });
      }
      if (
        languageSpoken.some((language) => !ALLOWED_LANGUAGES.includes(language))
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported language" });
      }
      nextLanguages = [
        ...new Set(
          languageSpoken.filter((lang) => ALLOWED_LANGUAGES.includes(lang)),
        ),
      ];
    }

    const rows = await sql`
      UPDATE farmers SET
        username = ${nextUsername},
        gender = ${nextGender},
        bio = ${nextBio},
        dob = ${nextDob},
        age = ${nextAge},
        address = ${nextAddress},
        lat = ${nextLat},
        lon = ${nextLon},
        city = ${nextCity},
        state = ${nextState},
        country = ${nextCountry},
        pincode = ${nextPincode},
        gov_id_name = ${nextGovName},
        gov_id_value = ${nextGovValue},
        facebook = ${nextFacebook},
        instagram = ${nextInstagram},
        language_spoken = ${nextLanguages},
        profile_version = profile_version + 1,
        updated_at = now()
      WHERE neon_user_id = ${userId} AND profile_version = ${current.profile_version}
      RETURNING *
    `;

    if (!rows.length)
      return res.status(409).json({
        success: false,
        message: "Profile changed. Reload it and retry.",
      });
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: toUser(
        await getFarmerByNeonId(sql, req.user.neon_user_id),
        req.accessToken,
      ),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) {
      return res
        .status(400)
        .json({ success: false, message: "Profile picture is required" });
    }
    let image;
    try {
      image = await profileImage(profilePic);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Use a readable JPEG, PNG or WebP profile photo",
      });
    }
    const sql = getSql();
    const asset = await uploadAsset(sql, req.user.neon_user_id, image, "image");
    const reference = AUTHENTICATED_PREFIX + asset.publicId;
    const results = await sql.transaction((tx) => [
      tx`SELECT neon_user_id FROM farmers WHERE neon_user_id=${req.user.neon_user_id} FOR UPDATE`,
      tx`INSERT INTO pending_uploads (public_id, farmer_id, resource_type, delivery_type)
         SELECT
           CASE WHEN profile_pic LIKE ${AUTHENTICATED_PREFIX + "%"}
             THEN substring(profile_pic, ${AUTHENTICATED_PREFIX.length + 1}::integer)
             ELSE substring(profile_pic, ${PRIVATE_PREFIX.length + 1}::integer) END,
           neon_user_id, 'image',
           CASE WHEN profile_pic LIKE ${AUTHENTICATED_PREFIX + "%"} THEN 'authenticated' ELSE 'private' END
         FROM farmers WHERE neon_user_id=${req.user.neon_user_id}
           AND (profile_pic LIKE ${AUTHENTICATED_PREFIX + "%"} OR profile_pic LIKE ${PRIVATE_PREFIX + "%"})
         ON CONFLICT (public_id) DO NOTHING`,
      tx`UPDATE farmers SET profile_pic = ${reference}, profile_version=profile_version+1, updated_at = now()
         WHERE neon_user_id = ${req.user.neon_user_id} RETURNING neon_user_id`,
      tx`DELETE FROM pending_uploads p WHERE public_id = ${asset.publicId}
         AND EXISTS (SELECT 1 FROM farmers f WHERE f.neon_user_id=${req.user.neon_user_id} AND profile_pic=${reference})`,
    ]);
    if (!results[2].length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user: toUser(
        await getFarmerByNeonId(sql, req.user.neon_user_id),
        req.accessToken,
      ),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      currentPassword.length > 128 ||
      newPassword.length > 128 ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }
    const sql = getSql();
    const cookie = await getSessionCookie(
      sql,
      req.accessToken,
      req.user.neon_user_id,
    );
    if (!cookie)
      return res.status(401).json({
        success: false,
        message: "Sign in again before updating your password",
      });
    const { ok, status, payload, sessionCookie } = await neonChangePassword({
      cookie,
      currentPassword,
      newPassword,
    });
    if (!ok) {
      if (status >= 500 || status === 429)
        return authFailure(res, status, "Could not update password");
      return res.status(400).json({
        success: false,
        message: authErrorMessage(payload, "Could not update password"),
      });
    }
    await closeOtherSessions(sql, req.accessToken, req.user.neon_user_id);
    if (sessionCookie)
      await saveSession(
        sql,
        req.accessToken,
        req.user.neon_user_id,
        req.accessTokenExpires,
        sessionCookie,
      );
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
