import { randomUUID } from "node:crypto";
import cloudinary from "./cloudinary.js";

export async function uploadAsset(sql, farmerId, buffer, resourceType) {
  const deliveryType = resourceType === "image" ? "authenticated" : "private";
  const publicId = `nila-shoshsho/${randomUUID()}${resourceType === "raw" ? ".pdf" : ""}`;
  // Reserve before external work so failed finalization leaves a durable cleanup record.
  await sql`INSERT INTO pending_uploads (public_id, farmer_id, resource_type, delivery_type)
            VALUES (${publicId}, ${farmerId}, ${resourceType}, ${deliveryType})`;
  const asset = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        type: deliveryType,
        overwrite: false,
        timeout: 15000,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.on("error", reject);
    stream.end(buffer);
  });
  if (
    !asset ||
    asset.public_id !== publicId ||
    asset.type !== deliveryType ||
    asset.resource_type !== resourceType ||
    !asset.secure_url?.startsWith("https://")
  ) {
    throw new Error("Invalid storage response");
  }
  return { publicId, url: asset.secure_url };
}
