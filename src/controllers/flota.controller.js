import { pool } from "../db.js";
import nodemailer from "nodemailer";

/* =============================
   ✉️ Configuración Outlook (Office365)
   ============================= */
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_USER,
    pass: process.env.OUTLOOK_PASS,
  },
  tls: { ciphers: "SSLv3" },
});

/* =========================================
   📦 CRUD básico de flota
   ========================================= */
export const getFlota = async (req, res) => {
  try {
    const { rol, departamentos } = req.user;
    let query, params = [];

    if (rol === "Administrador") {
      query = `
        SELECT f.*, d.nombre AS departamento_nombre
        FROM flota f
        LEFT JOIN departamentos d ON d.id = f.departamento_id
        ORDER BY f.id ASC
      `;
    } else {
      const ids = departamentos.map((d) => d.id);
      if (!ids.length) return res.json([]);
      query = `
        SELECT f.*, d.nombre AS departamento_nombre
        FROM flota f
        LEFT JOIN departamentos d ON d.id = f.departamento_id
        WHERE f.departamento_id = ANY($1)
        ORDER BY f.id ASC
      `;
      params = [ids];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener flota:", err);
    res.status(500).json({ error: "Error al obtener la flota" });
  }
};

export const addFlota = async (req, res) => {
  try {
    const {
  interno,
  chasis,
  dominio,
  marca,
  modelo,
  departamento_id,
  fecha_vtv,
  fecha_matafuego,
  fecha_lavado,
  fecha_seguro, // 👈 nuevo campo
} = req.body;

const result = await pool.query(
  `INSERT INTO flota (interno, chasis, dominio, marca, modelo, departamento_id, fecha_vtv, fecha_matafuego, fecha_lavado, fecha_seguro)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
   RETURNING *`,
  [
    interno,
    chasis,
    dominio || null,
    marca,
    modelo,
    departamento_id || null,
    fecha_vtv || null,
    fecha_matafuego || null,
    fecha_lavado || null,
    fecha_seguro || null,
  ]
);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al agregar vehículo:", err);
    res.status(500).json({ error: "Error al agregar vehículo" });
  }
};

export const updateFlota = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      interno,
      chasis,
      dominio,
      marca,
      modelo,
      departamento_id,
      fecha_vtv,
      fecha_matafuego,
      fecha_lavado,
      fecha_seguro, // 👈 agregado
    } = req.body;

    await pool.query(
      `UPDATE flota
       SET interno=$1, chasis=$2, dominio=$3, marca=$4, modelo=$5, departamento_id=$6,
           fecha_vtv=$7, fecha_matafuego=$8, fecha_lavado=$9, fecha_seguro=$10
       WHERE id=$11`,
      [
        interno,
        chasis,
        dominio || null,
        marca,
        modelo,
        departamento_id || null,
        fecha_vtv || null,
        fecha_matafuego || null,
        fecha_lavado || null,
        fecha_seguro || null, // 👈 agregado
        id,
      ]
    );

    res.json({ message: "Vehículo actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar vehículo:", err);
    res.status(500).json({ error: "Error al actualizar vehículo" });
  }
};


export const deleteFlota = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM flota WHERE id = $1", [id]);
    res.json({ message: "Vehículo eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar vehículo:", err);
    res.status(500).json({ error: "Error al eliminar vehículo" });
  }
};

/* =========================================
   🚛 Avisos automáticos de vencimientos
   ========================================= */
export async function checkVencimientosFlota() {
  console.log("⏰ Verificando vencimientos de vehículos...");

  try {
    const query = `
      SELECT f.*, d.id AS departamento_id, d.nombre AS departamento
      FROM flota f
      JOIN departamentos d ON d.id = f.departamento_id
    `;
    const { rows } = await pool.query(query);
    const hoy = new Date();

    console.log(`📋 Vehículos encontrados: ${rows.length}`);

    for (const v of rows) {
      const controles = [
        { tipo: "VTV/RTO", fecha: v.fecha_vtv, aviso: "previo" },
        { tipo: "Matafuego", fecha: v.fecha_matafuego, aviso: "previo" },
        { tipo: "Seguro", fecha: v.fecha_seguro, aviso: "previo" }, // 👈 nuevo
        { tipo: "Lavado", fecha: v.fecha_lavado, aviso: "posterior" },
      ];

      for (const c of controles) {
        if (!c.fecha) continue;

        const fechaControl = new Date(c.fecha);
        const diasDiferencia = Math.ceil(
          (fechaControl - hoy) / (1000 * 60 * 60 * 24)
        );
        let debeAvisar = false;

        // 🔹 Lógica por tipo
        if (c.aviso === "previo") {
          // VTV / Matafuego / Seguro → 1 mes, 15 y 7 días antes
          if ([30, 15, 7].includes(diasDiferencia)) debeAvisar = true;
        } else if (c.aviso === "posterior") {
          // Lavado → 14 días después
          const diasPosteriores = Math.floor(
            (hoy - fechaControl) / (1000 * 60 * 60 * 24)
          );
          console.log(`🚿 ${v.interno} — Días desde último lavado: ${diasPosteriores}`);
          if (diasPosteriores >= 13 && diasPosteriores <= 15) debeAvisar = true;
        }

        if (!debeAvisar) continue;

        const tag = `[flota:${c.tipo}:${v.id}|${c.fecha}]`;
        const subject =
          c.aviso === "posterior"
            ? `🚿 Lavado pendiente — Interno ${v.interno}`
            : `🚛 ${c.tipo} próximo a vencer — Interno ${v.interno}`;

        const text = `
El vehículo interno ${v.interno} (${v.marca} ${v.modelo} - ${v.dominio || "sin dominio"})
del departamento ${v.departamento} tiene el siguiente aviso:

• ${c.tipo}: ${new Date(c.fecha).toLocaleDateString("es-AR")}
${
  c.aviso === "posterior"
    ? "Han pasado dos semanas desde el último lavado registrado, recuerde realizar el próximo lavado."
    : `Quedan ${diasDiferencia} día(s) para el vencimiento.`
}

Por favor, gestionar la acción correspondiente.
        `.trim();

        // Evitar duplicados
        const avisoPrevio = await pool.query(
          `SELECT 1 FROM avisos WHERE tipo = 'Flota' AND mensaje ILIKE $1 LIMIT 1`,
          [`%${tag}%`]
        );
        if (avisoPrevio.rows.length > 0) continue;

        // Buscar destinatarios
        const emailsRes = await pool.query(
          `SELECT u.email
           FROM usuarios u
           JOIN usuario_departamento ud ON ud.usuario_id = u.id
           WHERE ud.departamento_id = $1 AND u.email IS NOT NULL`,
          [v.departamento_id]
        );

        const destinatarios = emailsRes.rows.map((r) => r.email).filter(Boolean);
        if (!destinatarios.length) continue;

        // ✉️ Enviar correo y registrar aviso
        try {
          await transporter.sendMail({
            from: `"Sistema TIM" <${process.env.OUTLOOK_USER}>`,
            to: destinatarios,
            subject,
            text,
          });

          await pool.query(
            `INSERT INTO avisos (tipo, mensaje, fecha_enviado, departamento_id, estado)
             VALUES ('Flota', $1, NOW(), $2, 'enviado')`,
            [text, v.departamento_id]
          );

          console.log(`✅ Aviso enviado a ${destinatarios.join(", ")} — ${subject}`);
        } catch (errMail) {
          console.error("❌ Error al enviar aviso:", errMail.message);
        }
      }
    }

    console.log("✅ Verificación finalizada.");
  } catch (err) {
    console.error("❌ Error al verificar vencimientos de flota:", err.message);
  }
}

