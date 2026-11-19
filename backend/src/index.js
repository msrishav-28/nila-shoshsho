import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import express from "express";
import "./lib/env.js";
import cors from "cors";
import { assertDb } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import reviewRoutes from "./routes/reviews.route.js";
import uploadRoutes from "./routes/upload.route.js";
import notificationRoutes from "./routes/notification.route.js";
import logisticsRoutes from "./routes/logistics.route.js";
import callbackRoutes from "./routes/callbacks.route.js";
import plotRoutes from "./routes/plots.route.js";
import {
  corsOrigin,
  rateLimit,
  securityHeaders,
  stagingAccess,
} from "./middleware/security.js";

export const app = express();
const PORT = process.env.ACCOUNT_PORT || process.env.PORT || 5001;
app.set("trust proxy", process.env.TRUSTED_PROXY_CIDRS || false);
app.use((req, res, next) => {
  const incoming = req.get("X-Request-ID") || "";
  const id = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(incoming)
    ? incoming
    : randomUUID();
  res.setHeader("X-Request-ID", id);
  const started = Date.now();
  res.once("finish", () =>
    console.info(
      JSON.stringify({
        requestId: id,
        method: req.method,
        route: req.route?.path || "unmatched",
        status: res.statusCode,
        ms: Date.now() - started,
      }),
    ),
  );
  const send = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && body && !body.code) {
      const codes = {
        400: "invalid_input",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        413: "too_large",
        429: "rate_limited",
        500: "internal_error",
        502: "upstream_failure",
        503: "service_unavailable",
      };
      return send({ ...body, code: codes[res.statusCode] || "request_failed" });
    }
    return send(body);
  };
  next();
});

app.use(securityHeaders);
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Request-ID",
      "X-Staging-Key",
    ],
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(stagingAccess);
app.use(rateLimit({ namespace: "global", windowMs: 60_000, max: 80 }));

app.use(
  "/api/auth/signup",
  rateLimit({ namespace: "signup", windowMs: 15 * 60_000, max: 10 }),
);
app.use(
  "/api/auth/login-email",
  rateLimit({ namespace: "login", windowMs: 15 * 60_000, max: 20 }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  if (
    !req.headers.authorization &&
    !["/api/auth/signup", "/api/auth/login-email"].includes(req.path)
  )
    return next();
  if (req.body === undefined) req.body = {};
  if (
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    !req.is("multipart/form-data") &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Expected a JSON object" });
  }
  next();
});
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/logistics", logisticsRoutes);
app.use("/api/voice-callbacks", callbackRoutes);
app.use("/api/plots", plotRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(
    JSON.stringify({
      event: "request_failure",
      requestId: res.getHeader("X-Request-ID"),
      category:
        err.type === "entity.parse.failed"
          ? "invalid_json"
          : err.type === "entity.too.large"
            ? "request_too_large"
            : "internal_error",
    }),
  );
  const status =
    err.type === "entity.parse.failed"
      ? 400
      : err.type === "entity.too.large"
        ? 413
        : err.status === 403
          ? 403
          : 500;
  const message = {
    400: "Invalid request body",
    413: "Request body too large",
    403: "Origin not allowed",
    500: "Internal Server Error",
  };
  res.status(status).json({ success: false, message: message[status] });
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await assertDb();
    const server = app.listen(PORT, () =>
      console.info(`Account server running on port ${PORT}`),
    );
    server.requestTimeout = 30000;
    server.headersTimeout = 10000;
    server.keepAliveTimeout = 5000;
    for (const signal of ["SIGTERM", "SIGINT"]) {
      process.once(signal, () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 35000).unref();
      });
    }
  } catch {
    console.error("Database is unreachable. Refusing to serve.");
    process.exitCode = 1;
  }
}
