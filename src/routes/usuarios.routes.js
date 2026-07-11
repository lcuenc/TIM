import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getDepartamentosByUsuario,
  setDepartamentosByUsuario
} from "../controllers/usuarios.controller.js";
import { validateUser } from "../middlewares/validateUser.js";

const router = Router();

// 🔐 Solo Admin puede manejar usuarios
router.get("/", verifyToken, isAdmin, getUsuarios);
router.post("/", verifyToken, isAdmin, validateUser, createUsuario);
router.put("/:id", verifyToken, isAdmin, validateUser, updateUsuario);
router.delete("/:id", verifyToken, isAdmin, deleteUsuario);

// 📌 Departamentos de un usuario
router.get("/:id/departamentos", verifyToken, isAdmin, getDepartamentosByUsuario);
router.put("/:id/departamentos", verifyToken, isAdmin, setDepartamentosByUsuario);

export default router;
