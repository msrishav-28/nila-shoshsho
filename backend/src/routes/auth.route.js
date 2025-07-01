import express from "express";
import {getProfileCompletion, loginWithEmail, loginWithPhone, logout, signup , updatePassword, updateProfile, updateProfilePic } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router()

router.post("/signup",signup)
router.post("/login-email",loginWithEmail)
router.post("/login-phone",loginWithPhone)
router.post("/logout",logout)
router.get('/profile-completion',protectRoute , getProfileCompletion)
router.put("/update-profile" , protectRoute , updateProfile)
router.put("/update-profile-pic" , protectRoute , updateProfilePic)
router.put("/update-password" , protectRoute , updatePassword)


export default router;