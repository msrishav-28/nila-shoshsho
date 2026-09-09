import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptJob,
  cancelJob,
  completeJob,
  createJob,
  listJobs,
} from "../controllers/logistics.controller.js";

const router = express.Router();

router.get("/jobs", protectRoute, listJobs);
router.post("/jobs", protectRoute, createJob);
router.put("/jobs/:id/accept", protectRoute, acceptJob);
router.put("/jobs/:id/cancel", protectRoute, cancelJob);
router.put("/jobs/:id/done", protectRoute, completeJob);

export default router;
