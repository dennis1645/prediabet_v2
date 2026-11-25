import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateAccountProfile,
  getWaReminders,
  saveWaReminders,
  getDueWaReminders,
  verifyWaBotLink,
} from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, getMe);
router.put("/profile", authenticateJWT, updateAccountProfile);
router.get("/wa-reminders", authenticateJWT, getWaReminders);
router.put("/wa-reminders", authenticateJWT, saveWaReminders);
router.get("/wa-bot/due", getDueWaReminders);
router.post("/wa-bot/verify-link", verifyWaBotLink);

export default router;
