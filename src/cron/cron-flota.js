import cron from "node-cron";
import { checkVencimientosFlota } from "../controllers/flota.controller.js";

const runAll = async () => {
  console.log("🕗 Ejecutando verificación automática de flota...");
  await checkVencimientosFlota();
  console.log("✅ Cron de flota finalizado.");
};

/* ============================
   🕗 Cron diario (08:00)
   ============================ */
cron.schedule("0 8 * * *", runAll, {
  timezone: "America/Argentina/Buenos_Aires",
});

// Ejecución inmediata al iniciar
runAll();
