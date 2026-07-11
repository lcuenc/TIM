import { Router } from "express";
import { verifyToken, verifyTokenFromQuery } from "../middlewares/auth.js";
import { getHistorial, exportHistorial } from "../controllers/historial.controller.js";

const router = Router();

/**
 * 📜 Historial de movimientos
 * Protegido con Bearer Token (Authorization header)
 */
router.get("/", verifyToken, getHistorial);

/**
 * 📥 Exportación CSV/XLSX
 * Se permite token por query string (?token=...)
 * Ideal para descargas directas desde <a> o window.open()
 */
router.get("/export", verifyTokenFromQuery, exportHistorial);

export default router;
