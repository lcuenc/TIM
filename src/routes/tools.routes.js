import { Router } from "express";
import {
  getAllTools,
  getToolById,
  addTool,
  updateTool,
  deleteTool,
  exportTools
} from "../controllers/tools.controller.js";

import { validateTool } from "../middlewares/validateTool.js";
import { verifyToken, isSupervisor, isAdmin } from "../middlewares/auth.js";

const router = Router();

// Ver todas las herramientas (cualquier usuario autenticado)
router.get("/", verifyToken, getAllTools);

// Exportar herramientas (con filtros)
router.get("/export", verifyToken, exportTools);

// Ver herramienta por id
router.get("/:id", verifyToken, getToolById);

// Crear herramienta (Supervisor o Admin)
router.post("/", verifyToken, isSupervisor, validateTool, addTool);

// Actualizar herramienta (Supervisor o Admin)
router.put("/:id", verifyToken, isSupervisor, validateTool, updateTool);

// Eliminar herramienta (solo Admin)
router.delete("/:id", verifyToken, isAdmin, deleteTool);

export default router;
