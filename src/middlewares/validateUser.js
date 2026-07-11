// src/middlewares/validateUser.js
import { body, validationResult } from "express-validator";

export const validateUser = [
  body("usuario")
    .notEmpty().withMessage("El usuario es obligatorio")
    .isLength({ min: 3, max: 50 }).withMessage("El usuario debe tener entre 3 y 50 caracteres"),

body("password")
  .if((value, { req }) => !req.params.id) // solo si es creación
  .notEmpty().withMessage("La contraseña es obligatoria")
  .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("rol")
    .isIn(["Abastecedor", "Supervisor", "Administrador"])
    .withMessage("Rol no válido"),

  body("departamentos")
    .optional({ nullable: true })
    .isArray().withMessage("Departamentos debe ser un array de IDs"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];
