import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { assertDb } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import uploadRoutes from "./routes/upload.route.js";
import notificationRoutes from "./routes/notification.route.js";
import logisticsRoutes from "./routes/logistics.route.js";
import {
  corsOrigin,
  rateLimit,
  securityHeaders,
} from "./middleware/security.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(rateLimit({ windowMs: 60_000, max: 80 }));

app.use(
  "/api/auth/signup",
  rateLimit({ windowMs: 15 * 60_000, max: 10 })
);
app.use(
  "/api/auth/login-email",
  rateLimit({ windowMs: 15 * 60_000, max: 20 })
);

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/logistics", logisticsRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

app.listen(PORT, async () => {
  try {
    await assertDb();
    console.log(`Account server running on port ${PORT}`);
  } catch (err) {
    console.error("Database is unreachable. Refusing to serve.", err.message);
    process.exit(1);
  }
});
