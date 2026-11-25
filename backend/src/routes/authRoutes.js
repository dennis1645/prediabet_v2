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
} from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, getMe);
router.put("/profile", authenticateJWT, updateAccountProfile);
router.get("/wa-reminders", authenticateJWT, getWaReminders);
router.put("/wa-reminders", authenticateJWT, saveWaReminders);
router.get("/wa-bot/status", authenticateJWT, getWaBotStatus);
router.post("/wa-bot/connect", authenticateJWT, connectWaBot);
router.post("/wa-bot/disconnect", authenticateJWT, disconnectWaBot);
router.post("/wa-bot/test-send", authenticateJWT, testSendWaReminder);
router.get("/wa-bot/due", getDueWaReminders);
router.post("/wa-bot/verify-link", verifyWaBotLink);

export default router;
