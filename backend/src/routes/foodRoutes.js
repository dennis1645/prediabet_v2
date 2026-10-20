import { Router } from "express";
import { searchFoods, getFoodDetail } from "../controllers/foodController.js";

const router = Router();

router.get("/", searchFoods);
router.get("/:id", getFoodDetail);

export default router;
