import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getSql } from "../lib/db.js";
import { isStaff, recordReview } from "../lib/reviews.js";
import { getFarmerByNeonId } from "../lib/farmer.js";

const router = express.Router();
router.use(protectRoute);
router.use((req, res, next) => {
  if (!isStaff(req.user.neon_user_id)) {
    return res
      .status(403)
      .json({ success: false, message: "Staff access required" });
  }
  next();
});

router.put("/:userId/:kind", async (req, res) => {
  const { kind } = req.params;
  const userId = req.params.userId.toLowerCase();
  const { approved, reason } = req.body || {};
  if (
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId) ||
    !["carrier", "identity"].includes(kind) ||
    typeof approved !== "boolean" ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.length > 500
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid account, review type, decision and reason",
    });
  }
  if (userId === req.user.neon_user_id) {
    return res.status(403).json({
      success: false,
      message: "A different staff member must review this account",
    });
  }
  const sql = getSql();
  const target = await getFarmerByNeonId(sql, userId);
  if (!target)
    return res
      .status(404)
      .json({ success: false, message: "Account not found" });
  if (
    approved &&
    ((kind === "carrier" && target.role !== "Logistics") ||
      (kind === "identity" &&
        (!target.gov_id_name || !target.gov_id_value?.startsWith("enc:v1:"))))
  ) {
    return res.status(422).json({
      success: false,
      message: "Account is not ready for this review",
    });
  }
  const saved = await recordReview(sql, {
    actor: req.user.neon_user_id,
    userId,
    kind,
    approved,
    reason: reason.trim(),
  });
  if (!saved)
    return res
      .status(404)
      .json({ success: false, message: "Account not found" });
  return res.json({ success: true });
});
export default router;
