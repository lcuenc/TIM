import { useEffect, useRef, useState } from "react";
import { getUser, logout } from "../utils/auth";
import logo from "../assets/logo.png";
import {
  BarChart3,
  FileText,
  Wrench,
  Car,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

export default function Navbar({ setPage }) {
  const user = getUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  if (!user) return null;

  const handleNav = (page) => {
    setPage(page);
    setOpen(false);
  };

  // Cierra el menú si clickeás fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-primary border-b border-secondary/40 text-text shadow-md sticky top-0 z-50 backdrop-blur-sm">
      <nav className="max-w-7xl mx-auto px-5 sm:px-10 py-3 flex items-center justify-between relative">
        {/* ---------- IZQUIERDA: LOGO + NOMBRE ---------- */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => handleNav("dashboard")}
        >
          <img src={logo} alt="Tool Inventory Management" className="h-9 w-auto" />
        </div>

        {/* ---------- DERECHA: USUARIO + MENÚ ---------- */}
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Usuario visible en pantallas grandes */}
          <div className="hidden sm:flex items-center bg-secondary/30 px-3 py-1.5 rounded-md gap-2">
            <User size={16} className="text-success" />
            <span className="text-sm font-medium text-text">{user.usuario}</span>
          </div>

          {/* Botón Hamburguesa */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-success transition"
          >
            {open ? <X size={22} className="text-text" /> : <Menu size={22} className="text-text" />}
          </button>

          {/* ---------- MENÚ DESPLEGABLE ---------- */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-primary border border-secondary/50 rounded-xl shadow-xl flex flex-col py-3 animate-fadeIn backdrop-blur-md">
              {/* Sección: Panel */}
              <p className="px-4 text-[11px] uppercase tracking-wide text-gray-200 font-semibold mb-1">
                Panel
              </p>
              <button
                onClick={() => handleNav("dashboard")}
                className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
              >
                <BarChart3 size={18} className="text-sky-400" />
                Dashboard
              </button>
              <button
                onClick={() => handleNav("registro")}
                className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
              >
                <FileText size={18} className="text-amber-400" />
                Registro
              </button>

              <div className="border-t border-secondary/40 my-2"></div>

              {/* Sección: Gestión */}
              <p className="px-4 text-[11px] uppercase tracking-wide text-gray-200 font-semibold mb-1">
                Gestión
              </p>
              <button
                onClick={() => handleNav("tools")}
                className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
              >
                <Wrench size={18} className="text-green-400" />
                Herramientas
              </button>
              <button
                onClick={() => handleNav("flota")}
                className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
              >
                <Car size={18} className="text-blue-400" />
                Flota Vehicular
              </button>

              {user.rol !== "Abastecedor" && (
                <button
                  onClick={() => handleNav("historial")}
                  className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
                >
                  <ScrollText size={18} className="text-purple-400" />
                  Historial
                </button>
              )}

              {user.rol === "Administrador" && (
                <>
                  <div className="border-t border-secondary/40 my-2"></div>
                  {/* Sección: Administración */}
                  <p className="px-4 text-[11px] uppercase tracking-wide text-gray-200 font-semibold mb-1">
                    Administración
                  </p>
                  <button
                    onClick={() => handleNav("admin")}
                    className="text-left px-4 py-2 hover:bg-secondary/30 transition rounded-md flex items-center gap-2"
                  >
                    <Settings size={18} className="text-orange-400" />
                    Panel Admin
                  </button>
                </>
              )}

              <div className="border-t border-secondary/40 my-2"></div>

              {/* Cerrar sesión */}
              <button
                onClick={() => logout(setPage)}
                className="text-left px-4 py-2 text-error hover:bg-error/10 transition font-semibold rounded-md flex items-center gap-2"
              >
                <LogOut size={18} className="text-red-400" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
