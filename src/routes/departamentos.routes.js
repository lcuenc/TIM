import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import {
  getDepartamentos,
  createDepartamento,
  updateDepartamento,
  deleteDepartamento,
} from "../controllers/departamentos.controller.js";

const router = Router();

// Ver todos los departamentos (cualquier usuario autenticado)
router.get("/", verifyToken, getDepartamentos);

// Crear, actualizar y eliminar departamentos (solo Admin)
router.post("/", verifyToken, isAdmin, createDepartamento);
router.put("/:id", verifyToken, isAdmin, updateDepartamento);
router.delete("/:id", verifyToken, isAdmin, deleteDepartamento);

export default router;
