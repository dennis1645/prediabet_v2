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
  getWaBotStatus,
  connectWaBot,
  disconnectWaBot,
  testSendWaReminder,
  uploadAvatar,
} from "../controllers/authController.js";
import { authenticateJWT, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, getMe);
router.put("/profile", authenticateJWT, updateAccountProfile);
router.post("/avatar", authenticateJWT, uploadAvatar);
router.get("/wa-reminders", authenticateJWT, getWaReminders);
router.put("/wa-reminders", authenticateJWT, saveWaReminders);
router.get("/wa-bot/status", authenticateJWT, getWaBotStatus);
router.post("/wa-bot/connect", authenticateJWT, requireRole("admin"), connectWaBot);
router.post("/wa-bot/disconnect", authenticateJWT, requireRole("admin"), disconnectWaBot);
router.post("/wa-bot/test-send", authenticateJWT, testSendWaReminder);
router.get("/wa-bot/due", getDueWaReminders);
router.post("/wa-bot/verify-link", verifyWaBotLink);

export default router;
