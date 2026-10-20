import { Router } from "express";
import { getActivities, calculateBurn } from "../controllers/foodController.js";

const router = Router();

router.get("/", getActivities);
router.post("/calculate", calculateBurn);

export default router;
