import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import cloudinary from "./cloudinary.js";

export const PRIVATE_PREFIX = "private:v1:";
export const AUTHENTICATED_PREFIX = "authenticated:v1:";

function privateLink(reference, prefix, type, resourceType, format) {
  if (!reference.startsWith(prefix))
    throw new Error("Invalid private document reference");
  return cloudinary.utils.private_download_url(
    reference.slice(prefix.length),
    format,
    {
      resource_type: resourceType,
      type,
      expires_at: Math.floor(Date.now() / 1000) + 300,
      attachment: false,
      secure: true,
    },
  );
}

export function documentLinks(references) {
  return references.map((reference) =>
    privateLink(reference, PRIVATE_PREFIX, "private", "raw", "pdf"),
  );
}

export function profileLink(reference) {
  // Earlier images do not meet the current access guarantee. Ask for a new photo.
  if (!reference?.startsWith(AUTHENTICATED_PREFIX)) return "";
  return privateLink(
    reference,
    AUTHENTICATED_PREFIX,
    "authenticated",
    "image",
    "jpg",
  );
}

export async function validatePdf(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length > 10 * 1024 * 1024 ||
    !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
  ) {
    throw new Error("Use a PDF smaller than 10 MB");
  }
  const pdf = await PDFDocument.load(buffer, {
    updateMetadata: false,
    throwOnInvalidObject: true,
  });
  if (pdf.getPageCount() < 1 || pdf.getPageCount() > 100)
    throw new Error("Use a PDF with 1–100 pages");
}

export async function profileImage(data) {
  if (typeof data !== "string" || data.length > 8 * 1024 * 1024)
    throw new Error("Invalid image");
  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw new Error("Provide a JPEG, PNG or WebP image");
  const bytes = Buffer.from(match[2], "base64");
  const image = sharp(bytes, { limitInputPixels: 16000000, failOn: "warning" });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    (metadata.pages || 1) !== 1
  )
    throw new Error("Use a still photo");
  return image
    .rotate()
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
}
