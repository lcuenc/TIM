// src/controllers/auth.controller.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";

/* ======================================
   🔑 LOGIN
====================================== */
export const login = async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE usuario=$1", [usuario]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const deptos = await pool.query(
      `SELECT d.id, d.nombre 
       FROM usuario_departamento ud
       JOIN departamentos d ON ud.departamento_id = d.id
       WHERE ud.usuario_id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        departamentos: deptos.rows.map((d) => ({ id: d.id, nombre: d.nombre })),
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: user.usuario,
      rol: user.rol,
      departamentos: deptos.rows,
    });
  } catch (err) {
    console.error("❌ Error en login:", err.message);
    res.status(500).json({ error: "Error en login" });
  }
};

/* ======================================
   🧩 REGISTER
====================================== */
export const register = async (req, res) => {
  const { usuario, password, rol, departamentos } = req.body;

  if (!usuario || !password || !rol) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (usuario, password_hash, rol)
       VALUES ($1, $2, $3) RETURNING id, usuario, rol`,
      [usuario, hashed, rol]
    );

    const newUser = result.rows[0];

    if (departamentos && departamentos.length > 0) {
      for (const deptoId of departamentos) {
        await pool.query(
          "INSERT INTO usuario_departamento (usuario_id, departamento_id) VALUES ($1, $2)",
          [newUser.id, deptoId]
        );
      }
    }

    res.status(201).json(newUser);
  } catch (err) {
    console.error("❌ Error en register:", err.message);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

/* ======================================
   🔒 Recuperación de contraseña
====================================== */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Solicitud de restablecimiento
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "El email es obligatorio." });

  try {
    const userRes = await pool.query("SELECT id, email FROM usuarios WHERE email = $1", [email]);
    if (userRes.rowCount === 0)
      return res.json({ message: "Si el correo existe, recibirás un email." });

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [user.id, tokenHash, expires]
    );

    const link = `https://timsys.site/reset-password?token=${token}`;
    const html = `
      <div style="font-family:sans-serif;color:#333">
        <h2>🔑 Restablecimiento de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Hacé clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${link}" style="color:#0a7a1c;font-weight:bold;">Restablecer contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste esto, ignorá este correo.</p>
      </div>
    `;

    await sendMail(user.email, "Restablecer contraseña – TIM", html);
    res.json({ message: "Si el correo existe, recibirás un email." });
  } catch (err) {
    console.error("❌ Error en forgotPassword:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Confirmar nuevo password
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Token y contraseña son requeridos." });

  try {
    const tokenHash = hashToken(token);
    const tRes = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    if (tRes.rowCount === 0)
      return res.status(400).json({ error: "Token inválido o expirado." });

    const t = tRes.rows[0];
    if (t.used)
      return res.status(400).json({ error: "El token ya fue utilizado." });
    if (new Date(t.expires_at) < new Date())
      return res.status(400).json({ error: "El token expiró." });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [hash, t.user_id]);
    await pool.query(`UPDATE password_reset_tokens SET used = true WHERE id = $1`, [t.id]);

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("❌ Error en resetPassword:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
