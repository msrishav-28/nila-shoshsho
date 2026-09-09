import { getSql } from "../lib/db.js";
import { getFarmerByNeonId } from "../lib/farmer.js";
import { readBearer, verifyAccessToken } from "../lib/verifyToken.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = readBearer(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - No Token Provided" });
    }

    const { neonUserId } = await verifyAccessToken(token);
    const farmer = await getFarmerByNeonId(getSql(), neonUserId);
    if (!farmer) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.accessToken = token;
    req.user = farmer;
    req.user._id = farmer.neon_user_id;
    next();
  } catch (err) {
    const status = err.status || 401;
    return res.status(status).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
};
