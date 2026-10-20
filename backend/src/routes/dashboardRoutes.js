import { Router } from "express";
import { getDashboard, regenerateMealPlan } from "../controllers/dashboardController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/", getDashboard);
router.post("/regenerate-meal-plan", regenerateMealPlan);

export default router;
