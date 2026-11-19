import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Writable } from "node:stream";
import { PGlite } from "@electric-sql/pglite";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import cloudinary from "./cloudinary.js";

test("signed users complete account, carrier approval and private document journeys", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  await database.exec(
    await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  function query(text, values) {
    return {
      text,
      values,
      then(resolve, reject) {
        return database
          .query(text, values)
          .then((result) => result.rows)
          .then(resolve, reject);
      },
    };
  }
  function sql(strings, ...values) {
    return query(
      strings.reduce(
        (result, part, i) =>
          result + part + (i < values.length ? "$" + (i + 1) : ""),
        "",
      ),
      values,
    );
  }
  sql.transaction = (queries) =>
    database.transaction(async (tx) => {
      const result = [];
      for (const item of typeof queries === "function"
        ? queries(sql)
        : queries) {
        result.push((await tx.query(item.text, item.values)).rows);
      }
      return result;
    });
  mock.module("./db.js", {
    namedExports: { getSql: () => sql, assertDb: async () => {} },
  });
  t.after(() => mock.restoreAll());
  const { privateKey, publicKey } = await generateKeyPair("EdDSA");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "fixture";
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
  ];
  const tokens = await Promise.all(
    ids.map((id) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "EdDSA", kid: "fixture" })
        .setSubject(id)
        .setIssuer("fixture-issuer")
        .setAudience("fixture-audience")
        .setExpirationTime("1h")
        .sign(privateKey),
    ),
  );
  let rejectLogout = false;
  const identity = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/jwks") return res.end(JSON.stringify({ keys: [jwk] }));
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    if (req.url === "/sign-out") {
      assert.match(req.headers.cookie || "", /\.session_token=/);
      res.statusCode = rejectLogout ? 503 : 200;
      return res.end("{}");
    }
    if (req.url === "/get-session") {
      const index = Number(req.headers.cookie?.slice(-1));
      res.setHeader("set-auth-jwt", tokens[index]);
      return res.end(JSON.stringify({ user: { id: ids[index] } }));
    }
    const index = Number(body.email.split("@")[0].slice(-1));
    assert.equal(req.headers.origin, process.env.NEON_AUTH_BASE_URL);
    res.setHeader(
      "Set-Cookie",
      "fixture.session_token=signed-" + index + "; HttpOnly",
    );
    res.end(
      JSON.stringify({
        user: { id: ids[index] },
        token: "opaque-provider-session",
      }),
    );
  });
  await new Promise((resolve) => identity.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => identity.close(resolve)));
  Object.assign(process.env, {
    NODE_ENV: "test",
    NEON_AUTH_BASE_URL: "http://127.0.0.1:" + identity.address().port,
    NEON_AUTH_JWKS_URL: "http://127.0.0.1:" + identity.address().port + "/jwks",
    NEON_AUTH_ISSUER: "fixture-issuer",
    NEON_AUTH_AUDIENCE: "fixture-audience",
    GOV_ID_KEY: "a".repeat(64),
    STAFF_USER_IDS: ids[3],
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    BOLNA_CALLBACK_ENABLED: "false",
  });
  cloudinary.config({
    cloud_name: "fixture",
    api_key: "fixture-key",
    api_secret: "fixture-secret",
  });
  mock.method(
    cloudinary.uploader,
    "upload_stream",
    (options, callback) =>
      new Writable({
        write(chunk, encoding, done) {
          done();
        },
        final(done) {
          callback(null, {
            public_id: options.public_id,
            type: options.type,
            resource_type: options.resource_type,
            secure_url: "https://fixture.invalid/" + options.public_id,
          });
          done();
        },
      }),
  );
  const { app } = await import("../index.js");
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  async function call(path, index, method = "GET", body, extraHeaders = {}) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        ...(index === null ? {} : { Authorization: "Bearer " + tokens[index] }),
        ...(body === undefined || body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...extraHeaders,
      },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  for (let index = 0; index < 4; index++) {
    const result = await call("/api/auth/signup", null, "POST", {
      username: "fixture" + index,
      email: "fixture" + index + "@example.test",
      password: "fixture-password",
      role: index === 1 || index === 2 ? "Logistics" : "Farmer",
      gender: "Other",
    });
    assert.equal(result.status, 201, JSON.stringify(result));
    assert.equal(result.data.user.accessToken, tokens[index]);
  }
  const callbackPath = "/api/voice-callbacks";
  const headers = { "Idempotency-Key": "fixture-callback" };
  const requestCallback = (index, key = headers["Idempotency-Key"]) =>
    call(
      callbackPath,
      index,
      "POST",
      { consent: true },
      { "Idempotency-Key": key },
    );
  assert.equal((await requestCallback(0)).status, 503);
  const execution = "00000000-0000-4000-8000-000000000010";
  const agent = "00000000-0000-4000-8000-000000000011";
  const number = "+919876543210";
  Object.assign(process.env, {
    BOLNA_CALLBACK_ENABLED: "true",
    BOLNA_AGENT_ID: agent,
    BOLNA_API_KEY: "fixture-bolna-key",
    BOLNA_TEST_RECIPIENTS: ids[0] + "=" + number,
    BOLNA_DAILY_LIMIT: "1",
    BOLNA_FROM_PHONE_NUMBER: "",
  });
  const fetchReal = globalThis.fetch;
  let dials = 0;
  const upstream = mock.method(globalThis, "fetch", (url, options) => {
    if (url === "https://api.bolna.ai/call") {
      assert.deepEqual(JSON.parse(options.body), {
        agent_id: agent,
        recipient_phone_number: number,
      });
      dials++;
      return Promise.resolve(Response.json({ execution_id: execution }));
    }
    if (url === "https://api.bolna.ai/executions/" + execution) {
      return Promise.resolve(
        Response.json({
          id: execution,
          agent_id: agent,
          status: "completed",
          transcript: "private fixture",
        }),
      );
    }
    return fetchReal(url, options);
  });
  assert.equal((await requestCallback(1)).status, 403);
  assert.equal(
    (await call(callbackPath, 0, "POST", { consent: false }, headers)).status,
    400,
  );
  const calls = await Promise.all([requestCallback(0), requestCallback(0)]);
  const created = calls.find((result) => result.status === 202);
  assert.ok(created, JSON.stringify(calls));
  assert.equal(
    calls.find((result) => result.status === 200).data.callbackId,
    created.data.callbackId,
  );
  assert.equal(created.data.status, "queued");
  assert.equal(dials, 1);
  assert.equal((await requestCallback(0, "different-key")).status, 429);
  const statusPath = callbackPath + "/" + created.data.callbackId;
  assert.equal((await call(statusPath, 1)).status, 404);
  await database.query(
    "UPDATE voice_callbacks SET checked_at = now() - interval '11 seconds'",
  );
  const status = await call(statusPath, 0);
  assert.equal(status.data.status, "completed");
  assert.equal("transcript" in status.data, false);
  upstream.mock.restore();
  assert.equal(
    (
      await call("/api/auth/update-profile", 0, "PUT", {
        governmentId: { idName: "Test", idValue: "12345" },
      })
    ).data.user.isVerified,
    false,
  );
  assert.equal(
    (
      await call("/api/auth/update-profile", 0, "PUT", {
        bio: "current",
        profileVersion: 1,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call("/api/auth/update-profile", 0, "PUT", {
        bio: "stale",
        profileVersion: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await call("/api/auth/update-profile", 0, "PUT", { role: "Logistics" }))
      .status,
    403,
  );
  assert.equal((await call("/api/logistics/jobs", 1)).status, 403);
  for (const index of [1, 2]) {
    assert.equal(
      (
        await call("/api/reviews/" + ids[index] + "/carrier", 0, "PUT", {
          approved: true,
          reason: "self assigned",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/api/reviews/" + ids[index] + "/carrier", 3, "PUT", {
          approved: true,
          reason: "Staff reviewed",
        })
      ).status,
      200,
    );
  }
  const job = await call(
    "/api/logistics/jobs",
    0,
    "POST",
    { crop: "Rice", quantityKg: 500 },
    { "Idempotency-Key": "fixture-job-1" },
  );
  assert.equal(job.status, 201);
  const retry = await call(
    "/api/logistics/jobs",
    0,
    "POST",
    { crop: "Rice", quantityKg: 500 },
    { "Idempotency-Key": "fixture-job-1" },
  );
  assert.equal(retry.data.job.id, job.data.job.id);
  assert.equal(
    (
      await call(
        "/api/logistics/jobs",
        0,
        "POST",
        { crop: "Rice", quantityKg: 600 },
        { "Idempotency-Key": "fixture-job-1" },
      )
    ).status,
    409,
  );
  const path = "/api/logistics/jobs/" + job.data.job.id;
  const claims = await Promise.all([
    call(path + "/accept", 1, "PUT", {}),
    call(path + "/accept", 2, "PUT", {}),
  ]);
  assert.equal(claims.filter((result) => result.status === 200).length, 1);
  const winner = claims[0].status === 200 ? 1 : 2;
  assert.equal(
    (await call(path + "/done", winner === 1 ? 2 : 1, "PUT", {})).status,
    404,
  );
  assert.equal((await call(path + "/done", winner, "PUT")).status, 200);
  assert.equal((await call(path + "/done", winner, "PUT")).status, 200);
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const form = new FormData();
  form.append(
    "document",
    new Blob([await pdf.save()], { type: "application/pdf" }),
    "fixture.pdf",
  );
  const uploaded = await call("/api/upload/upload-doc", 0, "POST", form);
  assert.equal(uploaded.status, 200, JSON.stringify(uploaded));
  assert.match(uploaded.data.user.documents[0], /expires_at=/);
  assert.equal((await call("/api/auth/me", 1)).data.user.documents.length, 0);
  assert.equal(
    (await database.query("SELECT count(*)::int AS n FROM pending_uploads"))
      .rows[0].n,
    0,
  );
  const png = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  const photoRequest = {
    profilePic: "data:image/png;base64," + png.toString("base64"),
  };
  const photoPath = "/api/auth/update-profile-pic";
  const photo = await call(photoPath, 0, "PUT", photoRequest);
  assert.equal(photo.status, 200);
  const firstPhoto = new URL(photo.data.user.profilePic);
  assert.equal(firstPhoto.searchParams.get("type"), "authenticated");
  assert.equal((await call("/api/auth/me", 1)).data.user.profilePic, "");
  const replacement = await call(photoPath, 0, "PUT", photoRequest);
  assert.equal(replacement.status, 200);
  assert.notEqual(replacement.data.user.profilePic, photo.data.user.profilePic);
  assert.deepEqual(
    (
      await database.query(
        "SELECT public_id, delivery_type FROM pending_uploads",
      )
    ).rows,
    [
      {
        public_id: firstPhoto.searchParams.get("public_id"),
        delivery_type: "authenticated",
      },
    ],
  );
  const plotBody = {
    crop: "Paddy",
    lat: 12.9,
    lon: 77.5,
    areaAcres: 2,
    sowingDate: "2026-06-15",
  };
  const plotHeaders = { "Idempotency-Key": "fixture-plot-1" };
  const createPlot = (actor, body = plotBody) =>
    call("/api/plots", actor, "POST", body, plotHeaders);
  assert.equal((await createPlot(1)).status, 403);
  assert.equal(
    (await createPlot(0, { ...plotBody, sowingDate: "2026-02-30" })).status,
    400,
  );
  const plot = await createPlot(0);
  assert.equal(plot.status, 201, JSON.stringify(plot));
  const plotId = plot.data.plot.plotId;
  assert.equal(plot.data.plot.sowingDate, "2026-06-15");
  assert.equal((await createPlot(0)).data.plot.plotId, plotId);
  assert.equal(
    (await createPlot(0, { ...plotBody, areaAcres: 3 })).status,
    409,
  );
  const plotPath = "/api/plots/" + plotId;
  const otherPlots = await call("/api/plots", 3);
  assert.equal(otherPlots.status, 200);
  assert.deepEqual(otherPlots.data.plots, []);
  assert.equal(
    (await call(plotPath, 3, "PATCH", { crop: "Wheat" })).status,
    404,
  );
  assert.equal((await call(plotPath, 3, "DELETE")).status, 404);
  const updatedPlot = await call(plotPath, 0, "PATCH", { areaAcres: 3 });
  assert.equal(updatedPlot.status, 200);
  assert.equal(updatedPlot.data.plot.areaAcres, 3);
  assert.equal(updatedPlot.data.plot.crop, "Paddy");
  assert.equal((await call(plotPath, 0, "DELETE")).status, 200);
  assert.deepEqual((await call("/api/plots", 0)).data.plots, []);
  rejectLogout = true;
  assert.equal((await call("/api/auth/logout", 0, "POST")).status, 502);
  rejectLogout = false;
  assert.equal((await call("/api/auth/logout", 0, "POST")).status, 200);
  assert.equal((await call("/api/auth/me", 0)).status, 401);
  assert.equal((await call("/api/auth/me", null)).status, 401);
});
