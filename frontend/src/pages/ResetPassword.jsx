import { useState, useEffect } from "react";
import api from "../utils/api";
import { Eye, EyeOff } from "lucide-react";
import logo from "../assets/logofull2.png";

export default function ResetPassword({ setPage }) {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const [strength, setStrength] = useState({ label: "", color: "", width: "0%" });
  const [requirements, setRequirements] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
  });

  // 🧠 Evaluar fuerza y requisitos
  const evaluateStrength = (value) => {
    const length = value.length >= 10;
    const upper = /[A-Z]/.test(value);
    const lower = /[a-z]/.test(value);
    const number = /\d/.test(value);
    const symbol = /[^A-Za-z0-9]/.test(value);

    setRequirements({ length, upper, lower, number, symbol });

    const metCount = [length, upper, lower, number, symbol].filter(Boolean).length;

    if (metCount <= 2)
      return { label: "Débil", color: "bg-red-500", width: "33%" };
    if (metCount === 3 || metCount === 4)
      return { label: "Media", color: "bg-yellow-400", width: "66%" };
    if (metCount === 5)
      return { label: "Fuerte", color: "bg-green-500", width: "100%" };

    return { label: "", color: "bg-transparent", width: "0%" };
  };

  useEffect(() => {
    setStrength(evaluateStrength(password));
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      await api.post("/auth/reset-password", { token, password });
      setOk(true);
    } catch {
      setError("El token es inválido o la contraseña no cumple los requisitos.");
    }
  };

  // ⏳ Redirigir automáticamente al login después de 3 segundos
  useEffect(() => {
    if (ok) {
      const timer = setTimeout(() => {
        setPage("login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ok, setPage]);

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
            Ingresá tu nueva contraseña para continuar
          </p>
        </div>

        {ok ? (
          <div className="text-center space-y-2">
            <p className="text-green-400 font-medium">
              Contraseña actualizada correctamente ✅
            </p>
            <p className="text-sm text-gray-400">
              Serás redirigido al inicio de sesión...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm text-gray-300 mb-1 font-medium">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full p-3 pr-10 rounded-lg bg-secondary/20 border border-secondary/50 text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-success transition"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Indicador visual */}
              {password && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-2 transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    ></div>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      strength.color === "bg-green-500"
                        ? "text-green-400"
                        : strength.color === "bg-yellow-400"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    Nivel: {strength.label}
                  </p>

                  {/* Lista de requisitos */}
                  <ul className="mt-2 text-sm text-gray-400 space-y-1">
                    <li
                      className={`flex items-center gap-2 ${
                        requirements.length ? "text-green-400" : ""
                      }`}
                    >
                      {requirements.length ? "✅" : "⬜"} Al menos 10 caracteres
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        requirements.upper ? "text-green-400" : ""
                      }`}
                    >
                      {requirements.upper ? "✅" : "⬜"} Una letra mayúscula (A–Z)
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        requirements.lower ? "text-green-400" : ""
                      }`}
                    >
                      {requirements.lower ? "✅" : "⬜"} Una letra minúscula (a–z)
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        requirements.number ? "text-green-400" : ""
                      }`}
                    >
                      {requirements.number ? "✅" : "⬜"} Un número (0–9)
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        requirements.symbol ? "text-green-400" : ""
                      }`}
                    >
                      {requirements.symbol ? "✅" : "⬜"} Un símbolo (@, #, $, etc.)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirmación */}
            <div>
              <label className="block text-sm text-gray-300 mb-1 font-medium">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full p-3 pr-10 rounded-lg bg-secondary/20 border border-secondary/50 text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-success transition"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              className="w-full py-3 bg-success rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Guardar nueva contraseña
            </button>

            {/* Errores */}
            {error && (
              <p className="text-red-400 text-sm text-center animate-fadeIn">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
