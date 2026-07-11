import { useState } from "react";
import api from "../utils/api";
import { login } from "../utils/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "../assets/logofull2.png";

export default function Login({ onLogin, setPage }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { usuario, password });
      login(res.data.token);
      onLogin?.();
    } catch {
      setError("Usuario o contraseña incorrectos.");
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
            Iniciá sesión para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Usuario */}
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
              autoComplete="username"
              autoFocus
              required
              className={`w-full p-3 rounded-lg bg-secondary/20 border ${
                error ? "border-red-500" : "border-secondary/50"
              } text-white placeholder-gray-500 focus:ring-2 focus:ring-success focus:border-transparent outline-none transition`}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`w-full p-3 pr-10 rounded-lg bg-secondary/20 border ${
                  error ? "border-red-500" : "border-secondary/50"
                } text-white placeholder-gray-500 focus:ring-2 focus:ring-success focus:border-transparent outline-none transition`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-success transition"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Botón ingresar */}
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
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </button>

          {/* Enlace de recuperación */}
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => setPage("forgot")}
              className="text-sm text-gray-400 hover:text-success transition"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 text-center text-red-400 text-sm animate-fadeIn">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
