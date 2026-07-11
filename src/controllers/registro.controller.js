// src/controllers/registro.controller.js
import { pool } from "../db.js";
import { enviarAvisoDanioInmediato } from "../cron/avisos.js"; // ⚠️ Import del cron centralizado

// =======================
// Listar todos los movimientos
// =======================
export const getAllRegistros = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, 
        h.codigo AS herramienta_codigo,
        h.descripcion AS herramienta_descripcion,
        r.tecnico, 
        r.tipo_movimiento, 
        r.fecha,
        u.usuario AS registrado_por,
        r.descripcion_dano
      FROM registros r
      LEFT JOIN herramientas h ON r.herramienta_id = h.id
      LEFT JOIN usuarios u ON r.registrado_por_id = u.id
      ORDER BY r.fecha DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en getAllRegistros:", error.message);
    res.status(500).json({ error: "Error al obtener registros" });
  }
};

// =======================
// Crear uno o varios movimientos con validación y transacción
// =======================
export const addRegistro = async (req, res) => {
  const { tecnico, tipo_movimiento, herramientas, descripcion_dano } = req.body;
  const registradoPor = req.user.id;

  if (!tecnico || !tipo_movimiento || !herramientas || herramientas.length === 0) {
    return res.status(400).json({ error: "Faltan datos en la solicitud" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificamos herramientas existentes
    const checkQuery = `
      SELECT id, codigo, descripcion, departamento_id 
      FROM herramientas 
      WHERE codigo = ANY($1)
    `;
    const checkResult = await client.query(checkQuery, [herramientas]);
    const codigosExistentes = checkResult.rows.map(r => r.codigo);

    const codigosInvalidos = herramientas.filter(c => !codigosExistentes.includes(c));
    if (codigosInvalidos.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Algunas herramientas no están registradas en el sistema",
        codigosInvalidos,
      });
    }

    const registros = [];

    for (const h of checkResult.rows) {
      // Inserta registro
      const insertQuery = `
        INSERT INTO registros 
          (herramienta_id, tecnico, tipo_movimiento, usuario_id, registrado_por_id, descripcion_dano)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const insertValues = [
        h.id,
        tecnico,
        tipo_movimiento,
        null,
        registradoPor,
        tipo_movimiento === "Devolución con daño" ? descripcion_dano || null : null,
      ];

      const { rows } = await client.query(insertQuery, insertValues);
      const nuevoRegistroId = rows[0].id;
      registros.push(nuevoRegistroId);

      // Actualiza estado según tipo de movimiento
      let nuevoEstado = null;
      switch (tipo_movimiento) {
        case "Entrega":
          nuevoEstado = "Prestada";
          break;
        case "Devolución":
          nuevoEstado = "Disponible";
          break;
        case "Devolución con daño":
        case "Mantenimiento / reparación":
          nuevoEstado = "Mantenimiento";
          break;
        case "Herramienta extraviada":
          nuevoEstado = "Baja";
          break;
      }

      if (nuevoEstado) {
        await client.query("UPDATE herramientas SET estado=$1 WHERE id=$2", [nuevoEstado, h.id]);
      }

      // 📧 Si es devolución con daño → enviar aviso inmediato centralizado
      if (tipo_movimiento === "Devolución con daño") {
        console.log(`🚨 Aviso inmediato: devolución con daño registrada (${h.codigo})`);
        try {
          await enviarAvisoDanioInmediato(nuevoRegistroId);
        } catch (err) {
          console.error("❌ Error al enviar aviso inmediato:", err.message);
        }
      }
    }

await client.query("COMMIT");

// 📧 Enviar avisos inmediatos después de confirmar transacción
if (tipo_movimiento === "Devolución con daño") {
  for (const registroId of registros) {
    try {
      console.log(`🚨 Aviso inmediato: devolución con daño registrada (registro ${registroId})`);
      await enviarAvisoDanioInmediato(registroId);
    } catch (err) {
      console.error("❌ Error al enviar aviso inmediato:", err.message);
    }
  }
}

res.status(201).json({ message: "Registros creados correctamente", registros });
  } finally {
    client.release();
  }
};
