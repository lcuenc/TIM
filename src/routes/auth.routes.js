import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import { validateUser } from "../middlewares/validateUser.js";
import { forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword)

// Login público
router.post("/login", login);

// Registro (solo Admin)
router.post("/register", verifyToken, isAdmin, validateUser, register);

export default router;
