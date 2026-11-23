import { Router } from "express";
import { authenticateJWT, requireRole } from "../middleware/authMiddleware.js";
import {
  listUsers,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  getUserChats,
  exportChats,
} from "../controllers/adminController.js";

const router = Router();

// Seluruh route admin wajib login & memiliki role === 'admin'
router.use(authenticateJWT, requireRole("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/role", updateUserRole);
router.post("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);
router.get("/users/:id/chats", getUserChats);
router.get("/chats/export", exportChats);

export default router;
