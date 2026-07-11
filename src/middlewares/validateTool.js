// src/middlewares/validateTool.js
import { body, validationResult } from "express-validator";

export const validateTool = [
  // ⚠️ Eliminamos validación de "codigo", se genera automáticamente

  body("descripcion")
    .notEmpty()
    .withMessage("La descripción es obligatoria"),

  body("categoria")
    .isIn([
      "Manual",
      "Eléctrica",
      "Hidráulica",
      "Neumatica",      // 👈 corregido sin tilde
      "Accesorio",
      "Izaje/Amarre",
      "Instrumento",
      "Roscado"
    ])
    .withMessage("Categoría no válida"),

  body("numero_serie")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("El número de serie no puede superar 50 caracteres"),

  body("fecha_incorporacion")
    .notEmpty()
    .withMessage("La fecha de incorporación es obligatoria")
    .isISO8601()
    .withMessage("La fecha debe tener formato YYYY-MM-DD"),

  body("estado")
    .isIn([
      "Disponible",
      "Prestada",
      "Mantenimiento",
      "Baja"
    ])
    .withMessage("Estado no válido"),

  body("valor_usd")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("El valor debe ser numérico"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];
