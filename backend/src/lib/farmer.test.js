import test from "node:test";
import assert from "node:assert/strict";
import { isMaskedGovId, maskGovId, toUser } from "./farmer.js";

test("masks a government id and keeps the last four characters", () => {
  assert.equal(maskGovId("123412341234"), "********1234");
  assert.equal(maskGovId(""), "");
  assert.equal(isMaskedGovId("********1234"), true);
  assert.equal(isMaskedGovId("123412341234"), false);
});

test("toUser does not put the full government id on the phone payload", () => {
  process.env.GOV_ID_KEY = "a".repeat(64);
  process.env.NODE_ENV = "development";
  const user = toUser(
    {
      neon_user_id: "id-1",
      username: "ram",
      email: "ram@example.com",
      role: "Farmer",
      gender: "Male",
      profile_pic: "",
      dob: null,
      age: null,
      address: "",
      lat: 0,
      lon: 0,
      city: "",
      state: "",
      country: "",
      pincode: "",
      gov_id_name: "Aadhaar",
      gov_id_value: "123412341234",
      language_spoken: [],
      bio: "",
      facebook: "",
      instagram: "",
      documents: [],
      is_verified: false,
    },
    "tok"
  );
  assert.equal(user.governmentId.idName, "Aadhaar");
  assert.equal(user.governmentId.idValue.includes("123412341234"), false);
  assert.equal(isMaskedGovId(user.governmentId.idValue), true);
});
