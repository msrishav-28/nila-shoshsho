import { createHash, timingSafeEqual } from "node:crypto";

const incrementScript =
  "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n";

export function rateLimit({ namespace, windowMs, max }) {
  const buckets = new Map();

  async function increment(key) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url || token || process.env.NODE_ENV === "production") {
      if (!url?.startsWith("https://") || !token)
        throw new Error("Counter unavailable");
      const response = await fetch(url, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(2000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EVAL", incrementScript, 1, key, windowMs]),
      });
      if (!response.ok) throw new Error("Counter unavailable");
      const { result } = await response.json();
      if (!Number.isSafeInteger(result) || result < 1)
        throw new Error("Invalid counter");
      return result;
    }
    const now = Date.now();
    if (buckets.size >= 4096) {
      for (const [id, item] of buckets) if (item.end <= now) buckets.delete(id);
      if (!buckets.has(key) && buckets.size >= 4096)
        throw new Error("Local counter capacity reached");
    }
    let bucket = buckets.get(key);
    if (!bucket || bucket.end <= now) {
      bucket = { count: 0, end: now + windowMs };
      buckets.set(key, bucket);
    }
    return ++bucket.count;
  }

  return async (req, res, next) => {
    try {
      const subject = createHash("sha256")
        .update(req.ip || "unknown")
        .digest("hex");
      const scope = process.env.STAGING_ACCESS_KEY ? "nila:staging" : "nila";
      if ((await increment(`${scope}:account:${namespace}:${subject}`)) > max) {
        res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
        return res.status(429).json({
          success: false,
          code: "rate_limited",
          message: "Too many requests",
        });
      }
    } catch {
      return res.status(503).json({
        success: false,
        code: "counter_unavailable",
        message: "Request controls unavailable",
      });
    }
    next();
  };
}

export function stagingAccess(req, res, next) {
  const key = process.env.STAGING_ACCESS_KEY;
  if (!key) return next();
  res.setHeader("Cache-Control", "private, no-store");
  const expected = Buffer.from(key);
  const provided = Buffer.from(req.get("X-Staging-Key") || "");
  if (
    expected.length >= 32 &&
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  )
    return next();
  return res.status(404).json({ success: false, message: "Not found" });
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
  const error = new Error("Origin not allowed");
  error.status = 403;
  return callback(error);
}
