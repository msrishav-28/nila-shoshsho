import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { uploadDoc } from '../controllers/upload.controller.js';

const router = express.Router();

router.post('/upload-doc', protectRoute, uploadDoc);

export default router;
