import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: "./src/.env" }); // ajustá si tu .env está en otro lugar

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

(async () => {
  try {
    console.log("📤 Enviando correo de prueba...");
    await transporter.sendMail({
      from: `"Sistema TIM" <${process.env.OUTLOOK_USER}>`,
      to: "lcuenca@sullair.com.ar",
      subject: "Prueba Outlook TIM",
      text: "Correo de prueba enviado desde la VPS TIM ✅",
    });
    console.log("✅ Correo enviado correctamente.");
  } catch (err) {
    console.error("❌ Error al enviar correo:", err.message);
  } finally {
    process.exit();
  }
})();
