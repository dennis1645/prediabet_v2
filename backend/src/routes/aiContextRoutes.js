import { Router } from "express";
import {
  getUserAIContext,
  saveChatLog,
  forwardChatToAI,
  getChatHistory,
  clearChatHistory,
} from "../controllers/aiContextController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/context", getUserAIContext);
router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);
router.post("/chat", forwardChatToAI);
router.post("/chat-log", saveChatLog);

export default router;
