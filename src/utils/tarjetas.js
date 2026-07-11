// src/utils/tarjetas.js
import fs from "fs";
import { parse } from "csv-parse/sync";

// 📦 Cache interno de tarjetas
let tarjetasMap = {};

/**
 * 🧭 Carga el archivo CSV de tarjetas y genera el mapa { codigo: nombreCompleto }
 */
export const cargarTarjetas = () => {
  try {
    const path = "src/data/tarjetas.csv";

    if (!fs.existsSync(path)) {
      console.warn("⚠️ Archivo de tarjetas no encontrado:", path);
      return;
    }

    const file = fs.readFileSync(path, "utf8");

    const records = parse(file, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    tarjetasMap = {};
    records.forEach((row) => {
      // Aseguramos consistencia en las claves
      const codigo = String(row.Codigo || row.codigo || "")
        .trim()
        .toUpperCase();

      const nombre = String(row.NombreCompleto || row.nombre || "")
        .trim();

      if (codigo && nombre) {
        tarjetasMap[codigo] = nombre;
      }
    });

    console.log(`✅ Tarjetas cargadas: ${Object.keys(tarjetasMap).length}`);
  } catch (err) {
    console.error("❌ Error cargando tarjetas:", err.message);
  }
};

/**
 * 🔍 Retorna el nombre completo según el código de tarjeta
 * Si no existe, devuelve el código original
 */
export const getNombreTarjeta = (codigo) => {
  if (!codigo) return "Sin técnico";
  const key = String(codigo).trim().toUpperCase();

  const nombre = tarjetasMap[key];
  if (nombre) return nombre;

  // Si no se encuentra exacto, intentar una búsqueda parcial (por prefijo)
  const match = Object.keys(tarjetasMap).find((k) => key.startsWith(k));
  if (match) return tarjetasMap[match];

  return codigo; // fallback
};
