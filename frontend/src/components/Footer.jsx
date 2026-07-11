// src/components/Footer.jsx
import { useState } from "react";
import { Mail } from "lucide-react";

export default function Footer() {
  const [copied, setCopied] = useState(false);
  const email = "lcuenca@sullair.com.ar";
  const subject = "[TIM] Bug o sugerencia";

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn("⚠️ No se pudo copiar el email:", err);
      alert("Tu navegador no permite copiar automáticamente. Copialo manualmente.");
    } finally {
      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`, "_blank");
    }
  };

  return (
    <footer className="w-full border-t border-secondary/40 bg-primary text-text mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-3">
        {/* Info principal */}
        <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-success">Tool Inventory Management</span> ·{" "}
          Desarrollado por <span className="font-medium text-gray-200">Leandro Cuenca</span>
        </p>

        {/* Botón Feedback */}
        <div className="relative">
          <button
            onClick={handleClick}
            className="group inline-flex items-center gap-2 rounded-lg border border-secondary/40 px-3 py-2 text-xs sm:text-sm text-gray-300 hover:text-success hover:border-success/50 hover:bg-success/10 transition-all duration-300 backdrop-blur-sm"
            aria-label="Enviar correo de sugerencia"
          >
            <Mail size={16} strokeWidth={1.6} />
            <span className="hidden sm:inline">Reportar bug / sugerencia</span>
          </button>

          {/* Tooltip Copiado */}
          <span
            className={`absolute -top-7 right-0 bg-success text-white text-[10px] px-2 py-1 rounded-md shadow-md transition-all duration-300 ${
              copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            Email copiado
          </span>
        </div>
      </div>
    </footer>
  );
}
