// src/cron/avisos.js
import { pool } from "../db.js";
import nodemailer from "nodemailer";
import cron from "node-cron";
import { getNombreTarjeta, cargarTarjetas } from "../utils/tarjetas.js";
import { checkVencimientosFlota } from "../controllers/flota.controller.js";

/* ============================
   ⚙️ Variables de entorno
   ============================ */
const {
  OUTLOOK_USER,
  OUTLOOK_PASS,
  AVISOS_ENABLED = "true",
  AVISOS_HORA = "0 8 * * *",
  AVISOS_MAX_PER_RUN = "80",
  AVISOS_DEBUG = "false",
  AVISOS_TO_OVERRIDE = "",
  AVISOS_RUN_ON_START = "false",
} = process.env;

const DEBUG = AVISOS_DEBUG === "true";
const ENABLED = AVISOS_ENABLED === "true";
const MAX_PER_RUN = Math.max(parseInt(AVISOS_MAX_PER_RUN, 10) || 0, 0);

/* ============================
   📧 Configuración Outlook
   ============================ */
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: { user: OUTLOOK_USER, pass: OUTLOOK_PASS },
});

/* ============================
   📇 Cargar tarjetas (una sola vez)
   ============================ */
cargarTarjetas();

/* ============================
   🔒 Deduplicación
   ============================ */
async function fueEnviado(tipo, herramientaId, tagLike, rangoDias = 120) {
  const q = `
    SELECT 1
    FROM avisos
    WHERE tipo = $1
      AND herramienta_id = $2
      AND mensaje ILIKE $3
      AND fecha_enviado >= NOW() - INTERVAL '${rangoDias} days'
    LIMIT 1
  `;
  const r = await pool.query(q, [tipo, herramientaId, `%${tagLike}%`]);
  return r.rows.length > 0;
}

async function registrarAviso(tipo, mensaje, herramienta_id, departamento_id) {
  try {
    await pool.query(
      `INSERT INTO avisos (tipo, mensaje, fecha_programada, fecha_enviado, departamento_id, herramienta_id, estado)
       VALUES ($1, $2, NOW(), NOW(), $3, $4, 'enviado')`,
      [tipo, mensaje, departamento_id, herramienta_id]
    );
    console.log("💾 Aviso registrado correctamente en BD.");
  } catch (err) {
    console.error("❌ Error registrando aviso en BD:", err.message);
  }
}

/* ============================
   ✉️ Envío de correos
   ============================ */
let enviadosEstaCorrida = 0;

async function enviarAviso(destinatarios, subject, text) {
  if (!destinatarios || destinatarios.length === 0) return false;
  if (MAX_PER_RUN && enviadosEstaCorrida >= MAX_PER_RUN) {
    console.warn("⏸️ Límite de envíos por corrida alcanzado. Se omiten avisos restantes.");
    return false;
  }

  const to = AVISOS_TO_OVERRIDE || destinatarios.join(",");

  if (DEBUG) {
    console.log("🟡 [DEBUG] Simulación de envío:", { to, subject, text });
    enviadosEstaCorrida++;
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"Sistema TIM" <${OUTLOOK_USER}>`,
      to,
      subject,
      text,
    });
    enviadosEstaCorrida++;
    console.log(`📧 Aviso enviado a: ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Error enviando correo:", err.message);
    return false;
  }
}

/* ============================
   👥 Obtener correos por departamento
   ============================ */
async function getEmailsDepartamento(departamentoId) {
  const usuariosDepto = await pool.query(
    `SELECT email
     FROM usuarios u
     JOIN usuario_departamento ud ON u.id = ud.usuario_id
     WHERE ud.departamento_id = $1 AND u.email IS NOT NULL`,
    [departamentoId]
  );
  return usuariosDepto.rows.map(r => r.email).filter(Boolean);
}

/* ============================
   🧪 Helpers varios
   ============================ */
function fechaAR(date) {
  return new Date(date).toLocaleDateString("es-AR");
}

/* =========================================
   🔧 Daños: primer aviso + cada 30 días
   ========================================= */
async function checkDanosPendientes() {
  console.log("⏰ Verificando devoluciones con daño pendientes...");

  const query = `
    WITH ultimos_danos AS (
      SELECT DISTINCT ON (h.id)
             h.id           AS herramienta_id,
             h.codigo,
             h.descripcion,
             h.estado       AS estado_herr,
             d.id           AS departamento_id,
             d.nombre       AS departamento,
             r.id           AS registro_id,
             r.fecha        AS fecha_dano,
             r.descripcion_dano,
             r.tecnico      AS tecnico_codigo
      FROM registros r
      JOIN herramientas h ON h.id = r.herramienta_id
      JOIN departamentos d ON d.id = h.departamento_id
      WHERE r.tipo_movimiento = 'Devolución con daño'
      ORDER BY h.id, r.fecha DESC
    )
    SELECT *
    FROM ultimos_danos
    WHERE estado_herr = 'Mantenimiento'
  `;

  const result = await pool.query(query);

  for (const row of result.rows) {
    const emails = await getEmailsDepartamento(row.departamento_id);
    if (emails.length === 0) continue;

    const tecnicoNombre = getNombreTarjeta(String(row.tecnico_codigo || "").toUpperCase());
    const tag = `[danio_registro:${row.registro_id}]`;
    const subject = `⚠️ Herramienta con daño pendiente (${row.codigo})`;

    const text = `
La herramienta ${row.codigo} - ${row.descripcion}
fue devuelta con daño el ${fechaAR(row.fecha_dano)} por ${tecnicoNombre}.

Descripción del daño: ${row.descripcion_dano || "No especificado"}.

Estado actual: "Mantenimiento"
Departamento: ${row.departamento}

Por favor, gestionar reparación/reposición o dar de baja si corresponde.
    `.trim();

    const avisoPrevio = await pool.query(
      `SELECT 1 FROM avisos WHERE tipo = 'Devolución con daño' AND mensaje ILIKE $1 LIMIT 1`,
      [`%[danio_registro:${row.registro_id}]%`]
    );

    const yaEnviado = avisoPrevio.rows.length > 0;
    if (!yaEnviado) {
      const ok = await enviarAviso(emails, subject, text);
      if (ok) await registrarAviso("Devolución con daño", text, row.herramienta_id, row.departamento_id);
      continue;
    }

    const rUlt = await pool.query(
      `SELECT MAX(fecha_enviado) AS ultima FROM avisos WHERE tipo = 'Devolución con daño' AND mensaje ILIKE $1`,
      [`%[danio_registro:${row.registro_id}]%`]
    );

    const ultima = rUlt.rows[0]?.ultima ? new Date(rUlt.rows[0].ultima) : null;
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);

    if (!ultima || ultima <= hace30) {
      const ok = await enviarAviso(emails, `${subject} — Reaviso cada 30 días`, text);
      if (ok) await registrarAviso("Devolución con daño", text, row.herramienta_id, row.departamento_id);
    }
  }
}

/* =========================================
   🧭 Aviso inmediato de daño
   ========================================= */
export async function enviarAvisoDanioInmediato(registroId) {
  try {
    const q = `
      SELECT r.id AS registro_id, r.fecha AS fecha_dano, r.descripcion_dano,
             r.tecnico AS tecnico_codigo,
             h.id AS herramienta_id, h.codigo, h.descripcion,
             d.id AS departamento_id, d.nombre AS departamento
      FROM registros r
      JOIN herramientas h ON h.id = r.herramienta_id
      JOIN departamentos d ON d.id = h.departamento_id
      WHERE r.id = $1
    `;
    const { rows } = await pool.query(q, [registroId]);
    if (rows.length === 0) return console.warn("⚠️ No se encontró el registro de daño.");

    const row = rows[0];
    const emails = await getEmailsDepartamento(row.departamento_id);
    if (emails.length === 0) return console.warn("⚠️ Sin destinatarios para aviso inmediato.");

    const tecnicoNombre = getNombreTarjeta(String(row.tecnico_codigo || "").toUpperCase());
    const subject = `⚠️ Nueva devolución con daño (${row.codigo})`;
    const text = `
La herramienta ${row.codigo} - ${row.descripcion}
fue devuelta con daño el ${fechaAR(row.fecha_dano)} por ${tecnicoNombre}.

Descripción del daño: ${row.descripcion_dano || "No especificado"}.

Departamento: ${row.departamento}

Por favor, revisar y gestionar la reparación o baja correspondiente.
    `.trim();

    const ok = await enviarAviso(emails, subject, text);
    if (ok) await registrarAviso("Devolución con daño (inmediato)", text, row.herramienta_id, row.departamento_id);
  } catch (err) {
    console.error("❌ Error en enviarAvisoDanioInmediato:", err.message);
  }
}

/* =========================================
   🧪 Calibraciones: 30 / 15 / 7 días antes
   ========================================= */
async function checkCalibraciones() {
  console.log("⏰ Verificando vencimientos de calibración...");

  const query = `
    SELECT h.id, h.codigo, h.descripcion, h.fecha_vencimiento,
           d.id AS departamento_id, d.nombre AS departamento
    FROM herramientas h
    JOIN departamentos d ON d.id = h.departamento_id
    WHERE h.fecha_vencimiento IS NOT NULL
      AND h.fecha_vencimiento >= CURRENT_DATE
      AND (h.estado IS NULL OR h.estado <> 'Baja')
  `;

  const res = await pool.query(query);

  for (const h of res.rows) {
    const diffDiasQuery = `SELECT ($1::date - CURRENT_DATE) AS dias`;
    const diffRes = await pool.query(diffDiasQuery, [h.fecha_vencimiento]);
    const dias = Number(diffRes.rows[0].dias);

    const umbral = [30, 15, 7].includes(dias) ? dias : null;
    if (!umbral) continue;

    const emails = await getEmailsDepartamento(h.departamento_id);
    if (emails.length === 0) continue;

    const tag = `[calibracion:venc:${new Date(h.fecha_vencimiento).toISOString().slice(0,10)}|umbral:${umbral}]`;
    const subject = `⏰ Calibración próxima a vencer (${h.codigo}) — ${umbral} días`;
    const text = `
${tag}
El instrumento ${h.codigo} - ${h.descripcion}
vence el ${fechaAR(h.fecha_vencimiento)}.

Quedan ${umbral} día(s) para su calibración.
Departamento: ${h.departamento}
    `.trim();

    const ya = await fueEnviado("Calibración", h.id, tag, 365);
    if (ya) continue;

    const ok = await enviarAviso(emails, subject, text);
    if (ok) await registrarAviso("Calibración", text, h.id, h.departamento_id);
  }
}

/* ============================
   🚦 Orquestación general
   ============================ */
export async function runAll() {
  if (!ENABLED) {
    console.log("⏹️ Avisos deshabilitados (AVISOS_ENABLED=false)");
    return;
  }
  enviadosEstaCorrida = 0;
  try {
    await checkCalibraciones();
    await checkDanosPendientes();
    await checkVencimientosFlota();
  } catch (e) {
    console.error("❌ Error en runAll:", e.message);
  } finally {
    console.log(`✅ Corrida finalizada. Emails enviados: ${enviadosEstaCorrida}`);
  }
}

/* ============================
   🕗 Cron diario (08:00)
   ============================ */
cron.schedule(AVISOS_HORA, runAll, { timezone: "America/Argentina/Buenos_Aires" });

if (AVISOS_RUN_ON_START === "true") {
  runAll();
}
