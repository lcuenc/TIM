// src/controllers/usuarios.controller.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";

// 📌 Obtener todos los usuarios con sus departamentos
export const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         u.id, 
         u.nombre,                -- 👈 agregado
         u.usuario, 
         u.rol,
         u.email, 
         COALESCE(string_agg(d.nombre, ', '), '') AS departamentos,
         COALESCE(array_remove(array_agg(d.id), NULL), '{}') AS departamento_ids
       FROM usuarios u
       LEFT JOIN usuario_departamento ud ON ud.usuario_id = u.id
       LEFT JOIN departamentos d ON d.id = ud.departamento_id
       GROUP BY u.id, u.nombre, u.usuario, u.rol, u.email   -- 👈 agregado u.nombre
       ORDER BY u.id`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en getUsuarios:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📌 Crear usuario con multi-departamento
export const createUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, usuario, password, rol, departamentos, email } = req.body;

    if (!nombre || !usuario || !password || !rol) {
      return res.status(400).json({ error: "Faltan campos obligatorios (nombre, usuario, password, rol)" });
    }

    const hash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    // 👇 Ajuste: se incluye la columna 'nombre' en el INSERT
    const userRes = await client.query(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, usuario, rol, email`,
      [nombre, usuario, hash, rol, email]
    );

    const newUser = userRes.rows[0];

    // 📎 Asignar departamentos al nuevo usuario
    if (Array.isArray(departamentos) && departamentos.length > 0) {
      for (const depId of departamentos) {
        await client.query(
          `INSERT INTO usuario_departamento (usuario_id, departamento_id)
           VALUES ($1, $2)`,
          [newUser.id, depId]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Usuario creado correctamente ✅", usuario: newUser });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en createUsuario:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};


// 📌 Actualizar usuario con multi-departamento
export const updateUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, usuario, rol, password, departamentos, email } = req.body;

    await client.query("BEGIN");

    let query, values;
    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, 10);
      query = `
        UPDATE usuarios
        SET nombre = $1, usuario = $2, password_hash = $3, rol = $4, email = $5
        WHERE id = $6
        RETURNING id, nombre, usuario, rol, email
      `;
      values = [nombre, usuario, hash, rol, email, id];
    } else {
      query = `
        UPDATE usuarios
        SET nombre = $1, usuario = $2, rol = $3, email = $4
        WHERE id = $5
        RETURNING id, nombre, usuario, rol, email
      `;
      values = [nombre, usuario, rol, email, id];
    }

    const userRes = await client.query(query, values);
    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const updatedUser = userRes.rows[0];

    // 🔄 Actualizar departamentos
    await client.query(`DELETE FROM usuario_departamento WHERE usuario_id = $1`, [id]);
    if (Array.isArray(departamentos) && departamentos.length > 0) {
      for (const depId of departamentos) {
        await client.query(
          `INSERT INTO usuario_departamento (usuario_id, departamento_id)
           VALUES ($1, $2)`,
          [id, depId]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Usuario actualizado ✅", usuario: updatedUser });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en updateUsuario:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};


// 📌 Eliminar usuario
export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado ✅" });
  } catch (err) {
    console.error("❌ Error en deleteUsuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📌 Obtener departamentos de un usuario
export const getDepartamentosByUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.id, d.nombre
       FROM usuario_departamento ud
       JOIN departamentos d ON d.id = ud.departamento_id
       WHERE ud.usuario_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en getDepartamentosByUsuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📌 Actualizar departamentos de un usuario
export const setDepartamentosByUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { departamentos } = req.body; // array de IDs de departamentos

    await client.query("BEGIN");
    await client.query("DELETE FROM usuario_departamento WHERE usuario_id = $1", [id]);

    if (Array.isArray(departamentos) && departamentos.length > 0) {
      for (const depId of departamentos) {
        await client.query(
          `INSERT INTO usuario_departamento (usuario_id, departamento_id)
           VALUES ($1, $2)`,
          [id, depId]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Departamentos actualizados ✅" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en setDepartamentosByUsuario:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
