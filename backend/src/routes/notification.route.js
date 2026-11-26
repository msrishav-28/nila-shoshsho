import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  ingestWeatherAlert,
  listNotifications,
  markNotificationRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, listNotifications);
router.post("/weather-check", protectRoute, ingestWeatherAlert);
router.put("/:id/read", protectRoute, markNotificationRead);

export default router;
