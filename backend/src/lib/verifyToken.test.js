import test from "node:test";
import assert from "node:assert/strict";
import { readBearer } from "./bearer.js";

test("missing authorization is rejected", () => {
  assert.equal(readBearer({ headers: {} }), null);
});

test("non-bearer schemes are rejected", () => {
  assert.equal(readBearer({ headers: { authorization: "Basic abc" } }), null);
});

test("bearer token is returned", () => {
  assert.equal(
    readBearer({ headers: { authorization: "Bearer tok_123" } }),
    "tok_123"
  );
});
