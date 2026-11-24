import { Router } from "express";
import { register, login, getMe, updateAccountProfile } from "../controllers/authController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, getMe);
router.put("/profile", authenticateJWT, updateAccountProfile);

export default router;
