import { getSql } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
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
import { createNotification } from "./notification.controller.js";
import { decryptGovId, encryptGovId } from "../lib/pii.js";

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
  return (
    payload?.message ||
    payload?.error?.message ||
    payload?.error ||
    fallback
  );
}

export const signup = async (req, res) => {
  const { username, email, password, role, gender } = req.body;

  if (!username || !email || !password || !role || !gender) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }
  if (!ALLOWED_ROLES.includes(role) || !ALLOWED_GENDERS.includes(gender)) {
    return res.status(400).json({ success: false, message: "Invalid role or gender" });
  }

  const sql = getSql();
  try {
    if (await getFarmerByEmail(sql, email)) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the given email",
      });
    }

    let { ok, payload } = await neonSignUp({
      email,
      password,
      name: username,
    });
    if (!ok) {
      const retry = await neonSignIn({ email, password });
      if (!retry.ok) {
        return res.status(400).json({
          success: false,
          message: authErrorMessage(payload, "Could not create account"),
        });
      }
      payload = retry.payload;
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

    let rows;
    let created = false;
    try {
      rows = await sql`
        INSERT INTO farmers (neon_user_id, email, phone_no, username, role, gender)
        VALUES (${neonUserId}, ${email}, ${''}, ${username.trim()}, ${role}, ${gender})
        RETURNING *
      `;
      created = Boolean(rows[0]);
    } catch (insertErr) {
      const existing = await getFarmerByNeonId(sql, neonUserId);
      if (!existing) {
        console.error("Error in signup insert", insertErr);
        return res.status(500).json({
          success: false,
          message: "Could not finish creating your account. Please try again.",
        });
      }
      rows = [existing];
    }

    if (created) {
      await createNotification(
        neonUserId,
        "Welcome to Nila Shoshsho",
        "Your account is ready. Weather, schemes, and crop tools are on Home."
      );
    }

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: toUser(rows[0], accessToken),
    });
  } catch (err) {
    console.error("Error in signup", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

async function completeLogin(res, email, password) {
  const { ok, payload } = await neonSignIn({ email, password });
  if (!ok) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
  const accessToken = extractAccessToken(payload);
  const authUser = extractAuthUser(payload);
  if (!accessToken || !authUser?.id) {
    return res.status(502).json({
      success: false,
      message: "Sign-in service did not return a session",
    });
  }
  const farmer = await getFarmerByNeonId(getSql(), authUser.id);
  if (!farmer) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: toUser(farmer, accessToken),
  });
}

export const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
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
    console.error("Error in loginWithEmail", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await neonSignOut({ token });
    }
  } catch (err) {
    console.error("Error in logout", err);
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
      user.is_verified,
    ];
    const filled = fields.filter((f) => f !== undefined && f !== null && f !== "").length;
    const percentage = Math.round((filled / fields.length) * 100);
    return res.json({
      success: true,
      percentage,
      filledFields: filled,
      totalFields: fields.length,
      message: `Your profile is ${percentage}% complete`,
    });
  } catch (err) {
    console.error(err);
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
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let nextUsername = current.username;
    let nextRole = current.role;
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
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      nextRole = role;
    }
    if (gender) {
      if (!ALLOWED_GENDERS.includes(gender)) {
        return res.status(400).json({ success: false, message: "Invalid gender" });
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
    if (dob) {
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
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedDate.getDate())) {
        age -= 1;
      }
      nextAge = age;
    }
    if (location) {
      nextAddress = location.address?.trim() || "";
      nextCity = location.city?.trim() || "";
      nextState = location.state?.trim() || "";
      nextCountry = location.country?.trim() || "";
      nextPincode = location.pincode?.trim() || "";
      const incomingLat = Number(location.lat);
      const incomingLon = Number(location.lon);
      const hasFix =
        Number.isFinite(incomingLat) &&
        Number.isFinite(incomingLon) &&
        incomingLat !== 0 &&
        incomingLon !== 0;
      if (hasFix) {
        nextLat = incomingLat;
        nextLon = incomingLon;
      }
      if (nextPincode && !/^\d{5,10}$/.test(nextPincode)) {
        return res.status(400).json({ success: false, message: "Invalid pincode format" });
      }
    }
    const incomingGovValue = governmentId?.idValue?.trim() || "";
    const keepCurrentGov = !governmentId || isMaskedGovId(incomingGovValue);
    const govIdPlain = keepCurrentGov
      ? decryptGovId(current.gov_id_value || "")
      : incomingGovValue;
    if (governmentId && !keepCurrentGov) {
      nextGovName = governmentId.idName?.trim() || "";
      nextGovValue = encryptGovId(govIdPlain);
    } else if (governmentId && governmentId.idName !== undefined) {
      nextGovName = governmentId.idName?.trim() || nextGovName;
    }
    if (socialLinks) {
      nextFacebook = socialLinks.facebook?.trim() || "";
      nextInstagram = socialLinks.instagram?.trim() || "";
    }
    if (languageSpoken) {
      if (!Array.isArray(languageSpoken)) {
        return res.status(400).json({
          success: false,
          message: "Languages spoken must be an array",
        });
      }
      nextLanguages = [...new Set(languageSpoken.filter((lang) => ALLOWED_LANGUAGES.includes(lang)))];
    }

    const rows = await sql`
      UPDATE farmers SET
        username = ${nextUsername},
        role = ${nextRole},
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
        is_verified = ${Boolean(nextGovName && govIdPlain)},
        updated_at = now()
      WHERE neon_user_id = ${userId}
      RETURNING *
    `;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: toUser(rows[0], req.accessToken),
    });
  } catch (err) {
    console.error("Error in updateProfile:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) {
      return res.status(400).json({ success: false, message: "Profile picture is required" });
    }
    const uploadRes = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pics",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    });
    const sql = getSql();
    const rows = await sql`
      UPDATE farmers SET profile_pic = ${uploadRes.secure_url}, updated_at = now()
      WHERE neon_user_id = ${req.user.neon_user_id}
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user: toUser(rows[0], req.accessToken),
    });
  } catch (err) {
    console.error("Error in updateProfilePic:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
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
    const { ok, payload } = await neonChangePassword({
      token: req.accessToken,
      currentPassword,
      newPassword,
    });
    if (!ok) {
      return res.status(400).json({
        success: false,
        message: authErrorMessage(payload, "Could not update password"),
      });
    }
    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in updatePassword:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
