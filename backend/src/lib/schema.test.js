import test from "node:test";
import assert from "node:assert/strict";
import { applySchema } from "../db/applySchema.js";

test("routine setup contains no record erasure and submits one transaction", async () => {
  const statements = [];
  const sql = {
    query(statement) {
      statements.push(statement);
      return statement;
    },
    async transaction(queries) {
      assert.deepEqual(queries, statements);
    },
  };
  await applySchema(sql);
  assert.ok(statements.length > 0);
  assert.ok(
    statements.some((s) => /CREATE TABLE IF NOT EXISTS farmers/.test(s)),
  );
  for (const statement of statements) {
    const sqlText = statement.replace(/--[^\n]*/g, "").trim();
    assert.doesNotMatch(sqlText, /^(?:UPDATE|DELETE|TRUNCATE|DROP)\b/i);
  }
});

test("setup failure propagates to the command", async () => {
  const failure = new Error("fixture transaction failure");
  await assert.rejects(
    applySchema({
      query: (statement) => statement,
      transaction: async () => {
        throw failure;
      },
    }),
    failure,
  );
});
