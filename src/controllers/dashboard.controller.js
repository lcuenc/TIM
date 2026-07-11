import { pool } from "../db.js";

export const getDashboard = async (req, res) => {
  try {
    // Admin ve todo, otros roles solo sus departamentos
    let deptoIds = [];
    if (req.user.rol !== "Administrador") {
      deptoIds = (req.user.departamentos || []).map((d) => d.id);
      if (deptoIds.length === 0) {
        return res.json({
          total: 0,
          disponibles: 0,
          prestadas: 0,
          mantenimiento: 0,
          bajas: 0,
          valorTotal: 0,
        });
      }
    }

    const where = deptoIds.length > 0 ? `WHERE departamento_id = ANY($1)` : "";

    const total = await pool.query(`SELECT COUNT(*) FROM herramientas ${where}`, deptoIds.length ? [deptoIds] : []);
    const disponibles = await pool.query(
      `SELECT COUNT(*) FROM herramientas ${where ? where + " AND" : "WHERE"} estado = 'Disponible'`,
      deptoIds.length ? [deptoIds] : []
    );
    const prestadas = await pool.query(
      `SELECT COUNT(*) FROM herramientas ${where ? where + " AND" : "WHERE"} estado = 'Prestada'`,
      deptoIds.length ? [deptoIds] : []
    );
    const mantenimiento = await pool.query(
      `SELECT COUNT(*) FROM herramientas ${where ? where + " AND" : "WHERE"} estado = 'Mantenimiento'`,
      deptoIds.length ? [deptoIds] : []
    );
    const bajas = await pool.query(
      `SELECT COUNT(*) FROM herramientas ${where ? where + " AND" : "WHERE"} estado = 'Baja'`,
      deptoIds.length ? [deptoIds] : []
    );

    const valorTotal = await pool.query(
      `SELECT COALESCE(SUM(valor_usd), 0) AS total FROM herramientas ${where}`,
      deptoIds.length ? [deptoIds] : []
    );

res.json({
  total: parseInt(total.rows[0].count),
  disponibles: parseInt(disponibles.rows[0].count),
  prestadas: parseInt(prestadas.rows[0].count),
  mantenimiento: parseInt(mantenimiento.rows[0].count),
  baja: parseInt(bajas.rows[0].count),   // 👈 singular para coincidir con frontend
  valorTotal: parseFloat(valorTotal.rows[0].total),
});

  } catch (error) {
    console.error("❌ Error en getDashboard:", error.message);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};
