import { pool } from "../db.js";

// Obtener todos los departamentos
export const getDepartamentos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM departamentos ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
};

// Crear departamento (solo Admin)
export const createDepartamento = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

    const result = await pool.query(
      "INSERT INTO departamentos (nombre) VALUES ($1) RETURNING *",
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear departamento" });
  }
};

// Actualizar departamento (solo Admin)
export const updateDepartamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const result = await pool.query(
      "UPDATE departamentos SET nombre = $1 WHERE id = $2 RETURNING *",
      [nombre, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Departamento no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar departamento" });
  }
};

// Eliminar departamento (solo Admin)
export const deleteDepartamento = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM departamentos WHERE id = $1", [id]);

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Departamento no encontrado" });

    res.json({ message: "Departamento eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar departamento" });
  }
};
