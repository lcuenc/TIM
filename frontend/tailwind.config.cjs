/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Helvetica", "Arial", "Verdana", "sans-serif"],
      },
      colors: {
        primary: "#1e293b",
        secondary: "#334155",
        background: "#0f172a",
        text: "#f1f5f9",
        success: "#22c55e",
        error: "#ef4444",
        warning: "#eab308",
      },
    },
  },
  plugins: [],
};
