// src/middlewares/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// 📌 Verificar token desde el header: Authorization: Bearer <token>
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}

// 📌 Verificar token desde query string (ej: exportaciones)
export function verifyTokenFromQuery(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}

// 📌 Middleware: solo administradores
export function isAdmin(req, res, next) {
  if (req.user?.rol !== "Administrador") {
    return res.status(403).json({ error: "Acceso solo para administradores" });
  }
  next();
}

// 📌 Middleware: supervisores o administradores
export function isSupervisor(req, res, next) {
  if (req.user?.rol === "Supervisor" || req.user?.rol === "Administrador") {
    return next();
  }
  return res.status(403).json({ error: "Acceso solo para supervisores o administradores" });
}

// 📌 Middleware: solo abastecedores
export function isAbastecedor(req, res, next) {
  if (req.user?.rol === "Abastecedor") {
    return next();
  }
  return res.status(403).json({ error: "Acceso solo para abastecedores" });
}
