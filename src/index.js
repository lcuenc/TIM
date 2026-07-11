import express from "express";
import dotenv from "dotenv";
import toolsRoutes from "./routes/tools.routes.js";
import registroRoutes from "./routes/registro.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();   // 👈 inicialización primero
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rutas
app.use("/api/tool", toolsRoutes);
app.use("/api/registro", registroRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);


// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
