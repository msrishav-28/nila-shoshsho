import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import cloudinary from "./cloudinary.js";
import {
  profileImage,
  validatePdf,
  documentLinks,
  PRIVATE_PREFIX,
} from "./privateFiles.js";

test("PDF validation parses a real document and rejects a forged signature", async () => {
  const document = await PDFDocument.create();
  document.addPage();
  await validatePdf(Buffer.from(await document.save()));
  await assert.rejects(validatePdf(Buffer.from("%PDF-fake")));
  await assert.rejects(validatePdf(undefined));
});

test("profile pictures decode pixels, remove metadata and reject remote URLs", async () => {
  const input = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "red" },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const output = await profileImage(
    "data:image/png;base64," + input.toString("base64"),
  );
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 200);
  assert.equal(metadata.height, 200);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  await assert.rejects(profileImage("https://example.test/private-network"));
  await assert.rejects(profileImage("data:image/png;base64,YmFk"));
});

test("private download links expire and contain a signed private asset reference", () => {
  cloudinary.config({
    cloud_name: "fixture",
    api_key: "fixture-key",
    api_secret: "fixture-secret",
  });
  const link = new URL(documentLinks([PRIVATE_PREFIX + "fixture/a.pdf"])[0]);
  assert.equal(link.protocol, "https:");
  assert.equal(link.searchParams.get("type"), "private");
  assert.equal(link.searchParams.get("public_id"), "fixture/a.pdf");
  assert.ok(
    Number(link.searchParams.get("expires_at")) <= Date.now() / 1000 + 300,
  );
  assert.ok(link.searchParams.get("signature"));
  assert.throws(() =>
    documentLinks(["https://example.test/public-document.pdf"]),
  );
});
