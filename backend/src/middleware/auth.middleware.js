import { getSql } from "../lib/db.js";
import { getFarmerByNeonId } from "../lib/farmer.js";
import { readBearer, verifyAccessToken } from "../lib/verifyToken.js";
import { isRevoked } from "../lib/revocation.js";

export function requireFarmer(req, res, next) {
  if (req.user?.role === "Farmer") return next();
  return res
    .status(403)
    .json({ success: false, message: "Farmer role required" });
}

export function requireApprovedCarrier(req, res, next) {
  if (req.user?.role === "Logistics" && req.user.carrier_approved === true)
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Approved carrier required" });
}

export const protectRoute = async (req, res, next) => {
  try {
    const token = readBearer(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - No Token Provided" });
    }

    const { neonUserId, payload } = await verifyAccessToken(token);
    if (await isRevoked(getSql(), token)) {
      return res.status(401).json({ success: false, message: "Session ended" });
    }
    const farmer = await getFarmerByNeonId(getSql(), neonUserId);
    if (!farmer) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.accessToken = token;
    req.accessTokenExpires = payload.exp;
    req.user = farmer;
    req.user._id = farmer.neon_user_id;
    next();
  } catch (err) {
    const status = err.status === 401 ? 401 : 503;
    return res.status(status).json({
      success: false,
      message: status === 401 ? "Unauthorized" : "Account service unavailable",
    });
  }
};
