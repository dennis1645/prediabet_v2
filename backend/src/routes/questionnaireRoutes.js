import { Router } from "express";
import { getDraft, saveDraft, submitQuestionnaire } from "../controllers/questionnaireController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/draft", getDraft);
router.post("/draft", saveDraft);
router.post("/submit", submitQuestionnaire);

export default router;
