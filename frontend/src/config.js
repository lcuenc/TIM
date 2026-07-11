// src/config.js

// Detecta si estamos en dev (vite) o prod (deploy)
const isDev = import.meta.env.MODE === "development";

// 👉 En dev usamos el proxy de Vite → "/api"
// 👉 En prod seteá la IP o dominio real de tu backend
export const API_URL = isDev ? "/api" : "http://51.222.204.196:4000";
