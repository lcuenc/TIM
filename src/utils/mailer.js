// src/utils/mailer.js
import nodemailer from "nodemailer";

const { OUTLOOK_USER, OUTLOOK_PASS } = process.env;

export const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: { user: OUTLOOK_USER, pass: OUTLOOK_PASS },
});

/**
 * Envía un correo genérico
 * @param {string} to - destinatario
 * @param {string} subject - asunto
 * @param {string} html - cuerpo del correo
 */
export async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from: `"Sistema TIM" <${OUTLOOK_USER}>`,
    to,
    subject,
    html,
  });
}
