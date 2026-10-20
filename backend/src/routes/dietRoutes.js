import { Router } from "express";
import { getAllDiets, getDietDetail, activateDiet, deactivateDiet } from "../controllers/dietController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes for browsing diet programs
router.get("/", getAllDiets);
router.get("/:slug", getDietDetail);

// Protected routes to activate/deactivate for logged-in user
router.post("/activate", authenticateJWT, activateDiet);
router.post("/deactivate", authenticateJWT, deactivateDiet);

export default router;
