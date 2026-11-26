import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { environmentFile } from "./env.js";

test("account configuration resolves to the shared repository file", () => {
  assert.equal(
    environmentFile,
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  );
});
