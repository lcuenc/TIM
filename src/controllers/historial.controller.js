// src/controllers/historial.controller.js
import { pool } from "../db.js";
import ExcelJS from "exceljs"; // 📦 npm install exceljs
import { getNombreTarjeta, cargarTarjetas } from "../utils/tarjetas.js";

// cargar CSV al iniciar
cargarTarjetas();

// =====================
// 📌 Listar historial
// =====================
export const getHistorial = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, tipo_movimiento, tecnico, limit, codigo, departamento } = req.query;

    let where = [];
    let values = [];
    let idx = 1;

    // 🔐 Restricción por rol
    if (req.user.rol !== "Administrador") {
      where.push(`d.id = ANY($${idx++})`);
      values.push(req.user.departamentos.map((dep) => dep.id));
    }

    // 📅 Filtros opcionales
    if (fecha_desde) {
      where.push(`r.fecha >= $${idx++}`);
      values.push(fecha_desde);
    }
    if (fecha_hasta) {
      where.push(`r.fecha <= $${idx++}`);
      values.push(fecha_hasta);
    }
    if (tipo_movimiento) {
      where.push(`r.tipo_movimiento = $${idx++}`);
      values.push(tipo_movimiento);
    }
    if (tecnico) {
      where.push(`r.tecnico ILIKE $${idx++}`);
      values.push(`%${tecnico}%`);
    }

    // 🆕 Filtros agregados
    if (codigo) {
      where.push(`h.codigo ILIKE $${idx++}`);
      values.push(`%${codigo}%`);
    }

    if (departamento) {
      where.push(`d.nombre ILIKE $${idx++}`);
      values.push(`%${departamento}%`);
    }

    let query = `
      SELECT r.id,
             h.codigo AS herramienta_codigo,
             h.descripcion AS herramienta_descripcion,
             r.tecnico,
             r.tipo_movimiento,
             r.descripcion_dano,
             d.nombre AS departamento,
             COALESCE(u.nombre, u.usuario) AS registrado_por,
             r.fecha
      FROM registros r
      JOIN herramientas h ON h.id = r.herramienta_id
      JOIN departamentos d ON d.id = h.departamento_id
      LEFT JOIN usuarios u ON u.id = r.registrado_por_id
    `;

    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }

    const safeLimit = Math.min(parseInt(limit) || 100, 1000);
    query += ` ORDER BY r.fecha DESC LIMIT ${safeLimit}`;

    const result = await pool.query(query, values);

    const rows = result.rows.map((r) => ({
      ...r,
      tecnico: getNombreTarjeta(r.tecnico),
    }));

    res.json(rows);
  } catch (err) {
    console.error("❌ Error en getHistorial:", err.message);
    res.status(500).json({ error: "Error al obtener historial" });
  }
};

// =====================
// 📌 Exportar historial a CSV/XLSX
// =====================
export const exportHistorial = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, tipo_movimiento, tecnico, formato } = req.query;

    let where = [];
    let values = [];
    let idx = 1;

    if (req.user.rol !== "Administrador") {
      where.push(`d.id = ANY($${idx++})`);
      values.push(req.user.departamentos.map((dep) => dep.id));
    }

    if (fecha_desde) {
      where.push(`r.fecha >= $${idx++}`);
      values.push(fecha_desde);
    }
    if (fecha_hasta) {
      where.push(`r.fecha <= $${idx++}`);
      values.push(fecha_hasta);
    }
    if (tipo_movimiento) {
      where.push(`r.tipo_movimiento = $${idx++}`);
      values.push(tipo_movimiento);
    }
    if (tecnico) {
      where.push(`r.tecnico ILIKE $${idx++}`);
      values.push(`%${tecnico}%`);
    }

    let query = `
      SELECT r.id,
             h.codigo AS herramienta_codigo,
             h.descripcion AS herramienta_descripcion,
             r.tecnico,
             r.tipo_movimiento,
             r.descripcion_dano,
             d.nombre AS departamento,
             COALESCE(u.nombre, u.usuario) AS registrado_por,
             r.fecha
      FROM registros r
      JOIN herramientas h ON h.id = r.herramienta_id
      JOIN departamentos d ON d.id = h.departamento_id
      LEFT JOIN usuarios u ON u.id = r.registrado_por_id
    `;
    if (where.length > 0) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY r.fecha DESC";

    const result = await pool.query(query, values);

    // 🔄 Mapear técnico con nombre del CSV
    const rows = result.rows.map((r) => ({
      ...r,
      tecnico: getNombreTarjeta(r.tecnico),
    }));

    if (formato === "csv") {
      const headers = [
        "ID", "Código", "Descripción", "Técnico",
        "Movimiento", "Descripción del daño", "Departamento", "Registrado por", "Fecha"
      ];
      const data = rows.map(r => [
        r.id, r.herramienta_codigo, r.herramienta_descripcion,
        r.tecnico, r.tipo_movimiento, r.descripcion_dano || "",
        r.departamento, r.registrado_por, r.fecha
      ]);

      let csv = headers.join(",") + "\n" + data.map(row => row.join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=historial.csv");
      return res.send(csv);

    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Historial");

      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Código", key: "herramienta_codigo", width: 15 },
        { header: "Descripción", key: "herramienta_descripcion", width: 30 },
        { header: "Técnico", key: "tecnico", width: 25 },
        { header: "Movimiento", key: "tipo_movimiento", width: 25 },
        { header: "Descripción del daño", key: "descripcion_dano", width: 35 },
        { header: "Departamento", key: "departamento", width: 25 },
        { header: "Registrado por", key: "registrado_por", width: 25 },
        { header: "Fecha", key: "fecha", width: 20 },
      ];

      rows.forEach(row => worksheet.addRow(row));

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=historial.xlsx");

      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    console.error("❌ Error en exportHistorial:", err.message);
    res.status(500).json({ error: "Error al exportar historial" });
  }
};
