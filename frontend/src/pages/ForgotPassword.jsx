import { useState } from "react";
import api from "../utils/api";
import logo from "../assets/logofull2.png";
import { Loader2 } from "lucide-react";

export default function ForgotPassword({ setPage }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Ocurrió un error al enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-white px-4">
      <div className="w-full max-w-md bg-primary border border-secondary/40 rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img
            src={logo}
            alt="Tool Inventory Management"
            className="h-28 mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
          />
          <p className="text-gray-400 text-sm">
            Ingresá tu correo para recibir el enlace de recuperación
          </p>
        </div>

        {/* Mensaje de confirmación */}
        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-lg">📩 Correo enviado</p>
            <p className="text-sm text-gray-300">
              Si el correo está registrado, recibirás un link para restablecer tu contraseña.
            </p>
            <button
              type="button"
              onClick={() => setPage("login")}
              className="w-full mt-4 py-3 rounded-lg font-semibold bg-success hover:bg-green-700 transition text-white"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo de correo */}
            <div>
              <label className="block text-sm text-gray-300 mb-1 font-medium">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                className="w-full p-3 rounded-lg bg-secondary/20 border border-secondary/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-success focus:border-transparent outline-none transition"
              />
            </div>

            {/* Botón con spinner */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-white ${
                loading
                  ? "bg-success/70 cursor-not-allowed"
                  : "bg-success hover:bg-green-700 shadow-lg hover:shadow-green-500/20"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enviando...
                </>
              ) : (
                "Enviar enlace"
              )}
            </button>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm text-center animate-fadeIn">{error}</p>
            )}

            {/* Volver */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setPage("login")}
                className="text-sm text-gray-400 hover:text-success transition"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
