import { Router } from "express";
import {
  getUserAIContext,
  saveChatLog,
  forwardChatToAI,
  getChatHistory,
  clearChatHistory,
  getChatSessions,
  createChatSession,
  getChatSessionHistory,
  deleteChatSession,
  logFoodDirect,
} from "../controllers/aiContextController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/context", getUserAIContext);
router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);
router.post("/chat", forwardChatToAI);
router.post("/chat-log", saveChatLog);
router.post("/log-food-direct", logFoodDirect);

// Rute Sesi Percakapan Multi-Thread (mirip ChatGPT / Gemini)
router.get("/sessions", getChatSessions);
router.post("/sessions", createChatSession);
router.get("/sessions/:sessionId/history", getChatSessionHistory);
router.delete("/sessions/:sessionId", deleteChatSession);

export default router;
