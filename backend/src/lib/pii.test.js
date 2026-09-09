import test from "node:test";
import assert from "node:assert/strict";
import { decryptGovId, encryptGovId } from "./pii.js";

test("encrypts and decrypts a government id", () => {
  process.env.GOV_ID_KEY = "a".repeat(64);
  process.env.NODE_ENV = "production";
  const locked = encryptGovId("123412341234");
  assert.ok(locked.startsWith("enc:v1:"));
  assert.notEqual(locked, "123412341234");
  assert.equal(decryptGovId(locked), "123412341234");
});

test("does not double-lock an already locked value", () => {
  process.env.GOV_ID_KEY = "a".repeat(64);
  const locked = encryptGovId("9999");
  assert.equal(encryptGovId(locked), locked);
});

test("hides leftover plaintext government ids in production", () => {
  process.env.GOV_ID_KEY = "a".repeat(64);
  process.env.NODE_ENV = "production";
  assert.equal(decryptGovId("123412341234"), "");
});
