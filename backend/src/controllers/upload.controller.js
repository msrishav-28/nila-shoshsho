import multer from "multer";
import { getSql } from "../lib/db.js";
import { getFarmerByNeonId, toUser } from "../lib/farmer.js";
import { PRIVATE_PREFIX, validatePdf } from "../lib/privateFiles.js";
import { uploadAsset } from "../lib/uploadAsset.js";

const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
}).single("document");

export const uploadDoc = (req, res) => {
  parse(req, res, async (error) => {
    if (error)
      return res
        .status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
        .json({ success: false, message: "Supply one PDF smaller than 10 MB" });
    try {
      await validatePdf(req.file?.buffer);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Supply a readable, unlocked PDF with 1–100 pages",
      });
    }
    try {
      const sql = getSql();
      const userId = req.user.neon_user_id;
      if ((req.user.documents || []).length >= 50) {
        return res
          .status(409)
          .json({ success: false, message: "Document allowance reached" });
      }
      const asset = await uploadAsset(sql, userId, req.file.buffer, "raw");
      const results = await sql.transaction((tx) => [
        tx`UPDATE farmers SET documents = array_append(documents, ${PRIVATE_PREFIX + asset.publicId}), updated_at=now()
           WHERE neon_user_id=${userId} AND cardinality(documents)<50 RETURNING neon_user_id`,
        tx`DELETE FROM pending_uploads p WHERE public_id=${asset.publicId}
           AND EXISTS (SELECT 1 FROM farmers f WHERE f.neon_user_id=${userId}
             AND ${PRIVATE_PREFIX + asset.publicId}=ANY(f.documents))`,
      ]);
      if (!results[0].length)
        return res
          .status(409)
          .json({ success: false, message: "Document allowance reached" });
      return res.json({
        success: true,
        message: "Document uploaded successfully",
        user: toUser(await getFarmerByNeonId(sql, userId), req.accessToken),
      });
    } catch {
      return res
        .status(502)
        .json({ success: false, message: "Document upload unavailable" });
    }
  });
};
