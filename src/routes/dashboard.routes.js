import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/auth.js";

const router = Router();

// 📊 Dashboard: protegido con login (cualquier rol autenticado puede ver su resumen)
router.get("/", verifyToken, getDashboard);

export default router;
