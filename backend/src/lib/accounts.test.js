import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { profileError } from "../middleware/validateProfile.js";
import { toUser } from "./farmer.js";
import { recordReview, isStaff } from "./reviews.js";
import { listJobs } from "../controllers/logistics.controller.js";
import { requireApprovedCarrier } from "../middleware/auth.middleware.js";

const owner = "00000000-0000-4000-8000-000000000001";
const staff = "00000000-0000-4000-8000-000000000002";

function sqlAdapter(database) {
  function sql(strings, ...values) {
    const text = strings.reduce(
      (result, part, index) =>
        result + part + (index < values.length ? "$" + (index + 1) : ""),
      "",
    );
    return { text, values };
  }
  return Object.assign(sql, {
    async transaction(callback) {
      const queries = callback(sql);
      return database.transaction(async (tx) => {
        const results = [];
        for (const query of queries)
          results.push((await tx.query(query.text, query.values)).rows);
        return results;
      });
    },
    then: undefined,
  });
}

test("fresh and repeated setup preserve stored records and staff decisions are auditable", async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(
      new URL("../db/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    for (const id of [owner, staff]) {
      await db.query(
        "INSERT INTO farmers(neon_user_id,email,username,role,gender,phone_no) VALUES ($1,$2,'farmer','Logistics','Other',$3)",
        [id, id + "@example.test", id === owner ? "+919876543210" : ""],
      );
    }
    await db.exec(schema);
    assert.equal(
      (
        await db.query("SELECT phone_no FROM farmers WHERE neon_user_id=$1", [
          owner,
        ])
      ).rows[0].phone_no,
      "+919876543210",
    );
    const sql = sqlAdapter(db);
    assert.equal(
      await recordReview(sql, {
        actor: owner,
        userId: owner,
        kind: "carrier",
        approved: true,
        reason: "Self",
      }),
      false,
    );
    assert.equal(
      await recordReview(sql, {
        actor: staff,
        userId: owner,
        kind: "carrier",
        approved: true,
        reason: "Reviewed documents",
      }),
      true,
    );
    assert.equal(
      await recordReview(sql, {
        actor: staff,
        userId: owner,
        kind: "carrier",
        approved: false,
        reason: "Access withdrawn",
      }),
      true,
    );
    const decisions = await db.query(
      "SELECT approved FROM account_reviews WHERE farmer_id=$1",
      [owner],
    );
    assert.equal(decisions.rows[0].approved, false);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM account_review_events"))
        .rows[0].n,
      2,
    );
    const backup = await db.dumpDataDir();
    const restored = new PGlite({ loadDataDir: backup });
    try {
      assert.equal(
        (
          await restored.query(
            "SELECT count(*)::int AS n FROM account_review_events",
          )
        ).rows[0].n,
        2,
      );
      assert.equal(
        (
          await restored.query(
            "SELECT phone_no FROM farmers WHERE neon_user_id=$1",
            [owner],
          )
        ).rows[0].phone_no,
        "+919876543210",
      );
    } finally {
      await restored.close();
    }
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.query("UPDATE farmers SET phone_no='' WHERE neon_user_id=$1", [
          owner,
        ]);
        await tx.query("SELECT missing_column FROM farmers");
      }),
    );
    assert.equal(
      (
        await db.query("SELECT phone_no FROM farmers WHERE neon_user_id=$1", [
          owner,
        ])
      ).rows[0].phone_no,
      "+919876543210",
    );
  } finally {
    await db.close();
  }
});

test("legacy verification flags do not confer staff-reviewed identity", () => {
  assert.equal(toUser({ is_verified: true }).isVerified, false);
  assert.equal(toUser({ identity_approved: true }).isVerified, true);
});

test("profile rejects malformed fields, impossible dates and coordinates", () => {
  for (const value of [
    { username: [] },
    { location: { city: 42 } },
    { dob: "2020-02-30" },
    { dob: "2999-01-01" },
    { location: { lat: Infinity } },
    { location: { lon: 181 } },
    { socialLinks: [] },
    { languageSpoken: [false] },
  ])
    assert.ok(profileError(value));
  assert.equal(
    profileError({
      location: { city: "Pune", lat: 0, lon: 77 },
      dob: "2000-02-29",
    }),
    null,
  );
  assert.equal(profileError({ dob: "" }), null);
});

test("pending carriers cannot list, accept or complete jobs", async () => {
  for (const handler of [listJobs, requireApprovedCarrier]) {
    let status;
    const res = {
      status(value) {
        status = value;
        return this;
      },
      json() {
        return this;
      },
    };
    await handler(
      {
        user: { role: "Logistics", carrier_approved: false },
        params: { id: "1" },
      },
      res,
      () => assert.fail("Pending carrier passed authorization"),
    );
    assert.equal(status, 403);
  }
});

test("staff identity comes from server configuration", () => {
  const before = process.env.STAFF_USER_IDS;
  try {
    process.env.STAFF_USER_IDS = staff;
    assert.equal(isStaff(owner), false);
    assert.equal(isStaff(staff), true);
  } finally {
    if (before === undefined) delete process.env.STAFF_USER_IDS;
    else process.env.STAFF_USER_IDS = before;
  }
});
