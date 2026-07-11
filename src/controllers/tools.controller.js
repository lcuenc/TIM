import { pool } from "../db.js";
import ExcelJS from "exceljs";
import { cargarTarjetas, getNombreTarjeta } from "../utils/tarjetas.js";

// Carga inicial del CSV en memoria (idempotente)
cargarTarjetas();

// 📌 Prefijos por categoría
const categoriaPrefijos = {
  "Manual": "M",
  "Eléctrica": "E",
  "Hidráulica": "H",
  "Neumatica": "N",
  "Accesorio": "A",
  "Izaje/Amarre": "I",
  "Instrumento": "T",
  "Roscado": "R",
};

// 📌 Obtener todas las herramientas con control de acceso por rol
export const getAllTools = async (req, res) => {
  try {
    const { rol, departamentos } = req.user; // viene del token

    let query = `
      SELECT h.*,
             d.nombre AS departamento,
             u.ultimo_usuario
      FROM herramientas h
      LEFT JOIN departamentos d ON d.id = h.departamento_id
      LEFT JOIN LATERAL (
        SELECT r.tecnico AS ultimo_usuario
        FROM registros r
        WHERE r.herramienta_id = h.id
          AND r.tipo_movimiento = 'Entrega'
        ORDER BY r.fecha DESC
        LIMIT 1
      ) u ON true
    `;

    const values = [];
    if (rol !== "Administrador") {
      query += ` WHERE d.id = ANY($1)`;
      values.push(departamentos.map((dep) => dep.id));
    }

    query += " ORDER BY h.codigo ASC";

    const result = await pool.query(query, values);

    const rows = result.rows.map((r) => ({
      ...r,
      ultimo_usuario: r.ultimo_usuario ? getNombreTarjeta(r.ultimo_usuario) : null,
    }));

    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getAllTools:", error);
    res.status(500).json({ error: "Error al obtener herramientas" });
  }
};

// 📌 Obtener una herramienta por id
export const getToolById = async (req, res) => {
  const toolId = Number(req.params.id);
  if (isNaN(toolId)) {
    return res.status(400).json({ error: "ID inválido, debe ser numérico" });
  }

  try {
    const result = await pool.query(`
      SELECT h.*, d.nombre AS departamento
      FROM herramientas h
      LEFT JOIN departamentos d ON d.id = h.departamento_id
      WHERE h.id = $1
    `, [toolId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Herramienta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error en getToolById:", error);
    res.status(500).json({ error: "Error al obtener herramienta" });
  }
};

// 📌 Crear herramienta
export const addTool = async (req, res) => {
  let {
    descripcion,
    categoria,
    numero_serie,
    fecha_incorporacion,
    estado,
    valor_usd,
    departamento_id,
    fecha_vencimiento, // 👈 nuevo campo
  } = req.body;

  if (!descripcion?.trim() || !categoria?.trim()) {
    return res.status(400).json({ error: "Descripción y categoría son obligatorias" });
  }

  valor_usd = !valor_usd || isNaN(Number(valor_usd)) ? 0 : Number(valor_usd);
  departamento_id = departamento_id ? Number(departamento_id) : null;

  try {
    const prefijo = categoriaPrefijos[categoria] || "X";

    // Buscar último código
    const last = await pool.query(
      "SELECT codigo FROM herramientas WHERE categoria = $1 ORDER BY codigo DESC LIMIT 1",
      [categoria]
    );

    let numero = 1;
    if (last.rows.length > 0) {
      const ultimoCodigo = last.rows[0].codigo;
      const ultimoNumero = parseInt(ultimoCodigo.split("-")[1]);
      numero = ultimoNumero + 1;
    }

    const codigo = `${prefijo}-${String(numero).padStart(6, "0")}`;

    const query = `
      INSERT INTO herramientas 
      (codigo, descripcion, categoria, numero_serie, fecha_incorporacion, estado, valor_usd, departamento_id, fecha_vencimiento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;

    const values = [
      codigo,
      descripcion,
      categoria,
      numero_serie,
      fecha_incorporacion,
      estado,
      valor_usd,
      departamento_id,
      fecha_vencimiento || null,
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error en addTool:", error);
    res.status(500).json({ error: "Error al crear herramienta", detail: error.message });
  }
};

// 📌 Actualizar herramienta
export const updateTool = async (req, res) => {
  const toolId = Number(req.params.id);
  if (isNaN(toolId)) {
    return res.status(400).json({ error: "ID inválido, debe ser numérico" });
  }

  let {
    descripcion,
    categoria,
    numero_serie,
    fecha_incorporacion,
    estado,
    valor_usd,
    departamento_id,
    fecha_vencimiento, // 👈 nuevo campo
  } = req.body;

  valor_usd = valor_usd === "" ? 0 : Number(valor_usd);
  departamento_id = departamento_id ? Number(departamento_id) : null;

  try {
    const query = `
      UPDATE herramientas 
      SET descripcion=$1, categoria=$2, numero_serie=$3, fecha_incorporacion=$4, estado=$5, valor_usd=$6, departamento_id=$7, fecha_vencimiento=$8
      WHERE id=$9 RETURNING *`;
    const values = [
      descripcion,
      categoria,
      numero_serie,
      fecha_incorporacion,
      estado,
      valor_usd,
      departamento_id,
      fecha_vencimiento || null,
      toolId,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Herramienta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error en updateTool:", error);
    res.status(500).json({ error: "Error al actualizar herramienta", detail: error.message });
  }
};

// 📌 Eliminar herramienta
export const deleteTool = async (req, res) => {
  const toolId = Number(req.params.id);
  if (isNaN(toolId)) {
    return res.status(400).json({ error: "ID inválido, debe ser numérico" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM herramientas WHERE id = $1 RETURNING *",
      [toolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Herramienta con id ${toolId} no encontrada` });
    }

    res.json({ message: `Herramienta ${result.rows[0].codigo} eliminada ✅` });
  } catch (error) {
    console.error("❌ Error en deleteTool:", error);
    res.status(500).json({ error: "Error al eliminar herramienta", detail: error.message });
  }
};

// 📌 Exportar herramientas
export const exportTools = async (req, res) => {
  try {
    const { estado, categoria, departamento, busqueda, formato } = req.query;

    let where = [];
    let values = [];
    let idx = 1;

    if (estado) {
      where.push(`h.estado = $${idx++}`);
      values.push(estado);
    }
    if (categoria) {
      where.push(`h.categoria = $${idx++}`);
      values.push(categoria);
    }
    if (departamento) {
      where.push(`d.nombre = $${idx++}`);
      values.push(departamento);
    }
    if (busqueda) {
      where.push(`(h.codigo ILIKE $${idx++} OR h.descripcion ILIKE $${idx++})`);
      values.push(`%${busqueda}%`);
      values.push(`%${busqueda}%`);
    }

    let query = `
      SELECT h.codigo,
             h.descripcion,
             h.numero_serie,
             h.categoria,
             h.estado,
             h.valor_usd,
             h.fecha_vencimiento,
             d.nombre AS departamento,
             u.ultimo_usuario
      FROM herramientas h
      JOIN departamentos d ON d.id = h.departamento_id
      LEFT JOIN LATERAL (
        SELECT r.tecnico AS ultimo_usuario
        FROM registros r
        WHERE r.herramienta_id = h.id
          AND r.tipo_movimiento = 'Entrega'
        ORDER BY r.fecha DESC
        LIMIT 1
      ) u ON true
    `;
    if (where.length > 0) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY h.codigo ASC";

    const result = await pool.query(query, values);

    const rows = result.rows.map((r) => ({
      ...r,
      ultimo_usuario: r.ultimo_usuario ? getNombreTarjeta(r.ultimo_usuario) : "-",
    }));

    if (formato === "csv") {
      const headers = [
        "Código",
        "Descripción",
        "N° Serie",
        "Categoría",
        "Estado",
        "Valor USD",
        "Fecha Vencimiento",
        "Departamento",
        "Último Usuario",
      ];

      const csvRows = rows.map((r) => [
        r.codigo,
        r.descripcion,
        r.numero_serie || "-",
        r.categoria,
        r.estado,
        r.valor_usd,
        r.fecha_vencimiento || "-",
        r.departamento,
        r.ultimo_usuario || "-",
      ]);

      const csv = headers.join(",") + "\n" + csvRows.map((row) => row.join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=herramientas.csv");
      return res.send(csv);
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Herramientas");

      worksheet.columns = [
        { header: "Código", key: "codigo", width: 15 },
        { header: "Descripción", key: "descripcion", width: 30 },
        { header: "N° Serie", key: "numero_serie", width: 20 },
        { header: "Categoría", key: "categoria", width: 20 },
        { header: "Estado", key: "estado", width: 20 },
        { header: "Valor USD", key: "valor_usd", width: 15 },
        { header: "Fecha Vencimiento", key: "fecha_vencimiento", width: 20 },
        { header: "Departamento", key: "departamento", width: 25 },
        { header: "Último Usuario", key: "ultimo_usuario", width: 25 },
      ];

      rows.forEach((row) => worksheet.addRow(row));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment: filename=herramientas.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    console.error("❌ Error en exportTools:", err);
    res.status(500).json({ error: "Error al exportar herramientas" });
  }
};
