import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Tools from "./pages/Tools";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import Historial from "./pages/Historial";
import Admin from "./pages/Admin";
import Flota from "./pages/Flota";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { isAuthenticated, getUser, logout, startInactivityWatcher } from "./utils/auth";
import api, { setOnUnauthorized } from "./utils/api";

function App() {
  const [page, setPage] = useState(() => {
    // 🧠 Detectar token de restablecimiento en URL
    const params = new URLSearchParams(window.location.search);
    if (params.has("token")) return "reset";

    // 🧩 Restaurar página guardada
    const saved = localStorage.getItem("currentPage");
    if (["forgot", "reset"].includes(saved)) return "login";
    return saved || "login";
  });


  const [user, setUser] = useState(null);

  // 📡 Registrar handler global para 401 (sin recargar)
  useEffect(() => {
    setOnUnauthorized(() => {
      console.warn("⚠️ Sesión expirada, redirigiendo al login...");
      setUser(null);
      setPage("login");
    });
  }, []);

  // 🔑 Handler después de login
  const handleLogin = () => {
    const currentUser = getUser();
    setUser(currentUser);
    setPage("dashboard");
  };

  // 🔑 Handler de logout manual
  const handleLogout = () => {
    logout(setPage);
    setUser(null);
  };

  // 🧠 Guard de autenticación y roles
  useEffect(() => {
    const currentUser = isAuthenticated() ? getUser() : null;

    if (currentUser) {
      setUser(currentUser);

      // Redirecciones por rol
      if (page === "admin" && currentUser.rol !== "Administrador") setPage("dashboard");
      if ((page === "historial" || page === "estados") && currentUser.rol === "Abastecedor")
        setPage("dashboard");
      if (page === "login" || page === "forgot" || page === "reset") setPage("dashboard");
    } else {
      // ✅ Permitimos vistas públicas de recuperación
      if (!["login", "forgot", "reset"].includes(page)) {
        logout(setPage);
        setUser(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 🕒 Iniciar watcher de inactividad solo cuando hay usuario autenticado
  useEffect(() => {
    if (user) {
      startInactivityWatcher(setPage);
    }
  }, [user]);

  // 💾 Guardar la última página visitada (solo si requiere login)
  useEffect(() => {
    if (!["login", "forgot", "reset"].includes(page)) {
      localStorage.setItem("currentPage", page);
    }
  }, [page]);

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-x-hidden text-text">
      {/* Navbar */}
      {page !== "login" && page !== "forgot" && page !== "reset" && (
        <Navbar setPage={setPage} user={user} onLogout={handleLogout} />
      )}

      {/* Contenido principal */}
      <div className="flex-1 p-4 overflow-y-auto">
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "tools" && <Tools />}
        {page === "registro" && <Registro />}
        {page === "historial" && <Historial />}
        {page === "admin" && <Admin />}
        {page === "flota" && <Flota />}
        {page === "login" && <Login onLogin={handleLogin} setPage={setPage} />}
        {page === "forgot" && <ForgotPassword setPage={setPage} />}
        {page === "reset" && <ResetPassword setPage={setPage} />}
      </div>

      {/* Footer */}
      {page !== "login" && page !== "forgot" && page !== "reset" && <Footer />}
    </div>
  );
}

export default App;
