import { Router } from "express";
import { getDailyLog, saveDailyLog, getWeeklySummary } from "../controllers/progressController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/summary/weekly", getWeeklySummary);
router.get("/:date?", getDailyLog);
router.post("/log", saveDailyLog);

export default router;
