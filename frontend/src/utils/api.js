// src/utils/api.js
import axios from "axios";
import { logout } from "./auth";

const api = axios.create({
  baseURL: "/api", // 👉 usa proxy de Nginx
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// 🔁 Interceptor para adjuntar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🔄 Callback que App.jsx puede registrar para manejar 401
let onUnauthorized = null;
export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

// ⚙️ Interceptor de respuesta: manejo centralizado de 401
let handling401 = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !handling401) {
      handling401 = true;
      logout(); // limpia token y usuario del storage

      if (typeof onUnauthorized === "function") {
        onUnauthorized(); // notifica a App.jsx → setPage("login")
      } else {
        console.warn("No hay handler de sesión, redirigiendo a login localmente.");
        window.location.hash = "#/login"; // fallback sin recargar todo
      }

      setTimeout(() => {
        handling401 = false;
      }, 300);
    }

    return Promise.reject(error);
  }
);

export default api;
