import { Router } from "express";
import { getAllRegistros, addRegistro } from "../controllers/registro.controller.js";
import { verifyToken, isAbastecedor } from "../middlewares/auth.js";

const router = Router();

// Ver registros: cualquier usuario autenticado (Abastecedor, Supervisor o Admin)
router.get("/", verifyToken, getAllRegistros);

// Crear registros: al menos Abastecedor
router.post("/", verifyToken, (req, res, next) => {
  if (["Abastecedor", "Supervisor", "Administrador"].includes(req.user.rol)) {
    return next();
  }
  return res.status(403).json({ error: "No autorizado" });
}, addRegistro);

export default router;
