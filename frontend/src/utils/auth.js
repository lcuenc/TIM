import { jwtDecode } from "jwt-decode";

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 min
const MAX_SESSION_TIME = 8 * 60 * 60 * 1000; // 8 horas
let inactivityTimer = null;
let sessionStartTime = Date.now();
let inactivityInterval = null;

export function getUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const user = getUser();
  return user && Date.now() < user.exp * 1000;
}

export function login(token) {
  localStorage.setItem("token", token);
  sessionStartTime = Date.now();
  try {
    const decoded = jwtDecode(token);
    localStorage.setItem("user", JSON.stringify(decoded));
  } catch {
    // si no se puede decodificar, seguimos igual
  }
  // 🚫 no iniciar watcher acá, App.jsx se encarga
}

export function getCachedUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : getUser();
}

export function logout(setPage) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearTimeout(inactivityTimer);
  clearInterval(inactivityInterval);
  if (typeof setPage === "function") setPage("login");
}

// 🔒 control de inactividad y sesión total
export function startInactivityWatcher(setPage) {
  if (!setPage) return; // Evita errores si se llama sin setPage

  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      logout(setPage);
      alert("Sesión cerrada por inactividad.");
    }, INACTIVITY_LIMIT);
  };

  // Limpiar listeners previos
  window.onmousemove = window.onmousedown = window.ontouchstart =
  window.onclick = window.onkeypress = resetTimer;
  window.addEventListener("scroll", resetTimer);

  resetTimer(); // Iniciar primer conteo

  // Controlar duración total
  clearInterval(inactivityInterval);
  inactivityInterval = setInterval(() => {
    if (Date.now() - sessionStartTime > MAX_SESSION_TIME) {
      logout(setPage);
      alert("Sesión expirada por tiempo prolongado.");
    }
  }, 60 * 1000);
}
