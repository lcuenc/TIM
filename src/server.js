import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron"; // ⏰ Agregado para programar tareas

import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import departamentosRoutes from "./routes/departamentos.routes.js";
import toolsRoutes from "./routes/tools.routes.js";
import registroRoutes from "./routes/registro.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import historialRoutes from "./routes/historial.routes.js";
import flotaRoutes from "./routes/flota.routes.js"; // 👈 nueva ruta

// 🔔 Cron de avisos general (calibraciones, daños, etc.)
import "./cron/avisos.js";

// 🚛 Función de control de flota
import { checkVencimientosFlota } from "./controllers/flota.controller.js";

dotenv.config();
const app = express();

// ================================
// 🌐 Middlewares
// ================================
app.use(cors());
app.use(express.json());

// ================================
// 📦 Rutas API
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/departamentos", departamentosRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/registros", registroRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/historial", historialRoutes);
app.use("/api/flota", flotaRoutes); // 👈 nueva ruta registrada

// ================================
// 🌍 Ruta pública de prueba
// ================================
app.get("/", (req, res) => {
  res.send("API funcionando ✅");
});

// ================================
// 🚛 Cron diario de Flota (08:00 AM)
// ================================
const ejecutarCronFlota = async () => {
  console.log("🕗 [CRON-FLOTA] Iniciando verificación programada...");
  await checkVencimientosFlota();
  console.log("✅ [CRON-FLOTA] Verificación completada.");
};

// Programa la ejecución diaria
cron.schedule("0 8 * * *", ejecutarCronFlota, {
  timezone: "America/Argentina/Buenos_Aires",
});

// Ejecuta una vez al iniciar el servidor
ejecutarCronFlota();

// ================================
// 🚀 Server
// ================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
