import express from 'express';
import { generateAndSendOTP, verifyOTP } from '../controllers/otp.controller.js';

const router = express.Router();

router.post('/otp-generate', generateAndSendOTP);
router.post('/otp-verify', verifyOTP);

export default router;