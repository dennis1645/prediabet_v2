import { Router } from "express";
import {
  getOnboardingState,
  answerOnboardingQuestion,
  resetOnboarding
} from "../controllers/onboardingController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/state", getOnboardingState);
router.post("/answer", answerOnboardingQuestion);
router.post("/reset", resetOnboarding);

export default router;
