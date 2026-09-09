const buckets = new Map();

function clientKey(req) {
  const token = (req.headers.authorization || "").slice(0, 40);
  return `${req.ip || "unknown"}:${token}:${req.path}`;
}

export function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req);
    const current = buckets.get(key);
    if (!current || now - current.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait and try again.",
      });
    }
    return next();
  };
}

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  next();
}

export function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  const allowed = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) {
    return callback(null, true);
  }
  if ((process.env.NODE_ENV || "development") !== "production") {
    return callback(null, true);
  }
  return callback(new Error("Origin not allowed"));
}
