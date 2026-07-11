import { Router } from "express";
import {
  getFlota,
  addFlota,
  updateFlota,
  deleteFlota,
} from "../controllers/flota.controller.js";
import { verifyToken } from "../middlewares/auth.js"; // ✅ igual que tools.routes.js

const router = Router();

router.get("/", verifyToken, getFlota);
router.post("/", verifyToken, addFlota);
router.put("/:id", verifyToken, updateFlota);
router.delete("/:id", verifyToken, deleteFlota);

export default router;
