// src/pages/Historial.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import { getUser, isAuthenticated } from "../utils/auth";
import { ClipboardList, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";

export default function Historial() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({
    codigo: "",
    departamento: "",
    desde: "",
    hasta: "",
  });

  // 📄 Paginación local
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(registros.length / pageSize);
  const registrosPaginados = registros.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const user = getUser();

  // 🔒 Validar sesión
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
    }
  }, []);

  // ==========================
  // 📦 Cargar datos (con debounce)
  // ==========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (filtros.codigo) params.codigo = filtros.codigo;
        if (filtros.departamento) params.departamento = filtros.departamento;
        if (filtros.desde) params.fecha_desde = filtros.desde;
        if (filtros.hasta) params.fecha_hasta = filtros.hasta;

        const res = await api.get("/historial", { params });
        setRegistros(res.data);
      } catch (err) {
        console.error("❌ Error cargando historial:", err);
        setError("Error al cargar historial");
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(fetchData, 400);
    return () => clearTimeout(delay);
  }, [filtros]);

  // ==========================
  // 🏢 Departamentos únicos (memoizados)
  // ==========================
  const departamentosUnicos = useMemo(() => {
    return [...new Set(registros.map((r) => r.departamento).filter(Boolean))];
  }, [registros]);

  // ==========================
  // 📤 Exportar CSV/XLSX
  // ==========================
  const handleExport = (formato) => {
    const query = new URLSearchParams({
      formato,
      codigo: filtros.codigo || "",
      departamento: filtros.departamento || "",
      desde: filtros.desde || "",
      hasta: filtros.hasta || "",
      token: localStorage.getItem("token"),
    }).toString();

    window.open(`/api/historial/export?${query}`, "_blank");
  };

  // ==========================
  // 🎨 Render
  // ==========================
  return (
    <div className="p-6 text-text bg-background min-h-screen">
      {/* ================== Encabezado ================== */}
      <div className="flex flex-col items-center justify-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
          <ClipboardList size={26} className="text-success" /> Panel de Historial
        </h1>
        <p className="text-gray-400 text-sm mt-1 text-center">
          Consultá y exportá todos los movimientos registrados en el sistema
        </p>
        <div className="w-24 h-[2px] bg-success mt-3 rounded-full" />
      </div>

      {/* 🔎 Filtros */}
      <div className="bg-primary border border-secondary/40 shadow p-4 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Código */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1 text-gray-200">Código</label>
          <input
            type="text"
            placeholder="Ej: H-000123"
            value={filtros.codigo}
            onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
            className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:outline-none focus:ring-2 focus:ring-success"
          />
        </div>

        {/* Departamento */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1 text-gray-200">Departamento</label>
          <select
            value={filtros.departamento}
            onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}
            className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:outline-none focus:ring-2 focus:ring-success"
          >
            <option value="">Todos los departamentos</option>
            {departamentosUnicos.map((dep, idx) => (
              <option key={idx} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        {/* Desde */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1 text-gray-200">Desde</label>
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:outline-none focus:ring-2 focus:ring-success"
          />
        </div>

        {/* Hasta */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1 text-gray-200">Hasta</label>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:outline-none focus:ring-2 focus:ring-success"
          />
        </div>
      </div>

      {/* 📥 Exportar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => handleExport("csv")}
          className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition"
          title="Exportar CSV"
        >
          <FileText size={18} />
          Exportar CSV
        </button>

        <button
          onClick={() => handleExport("xlsx")}
          className="bg-success hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition"
          title="Exportar Excel"
        >
          <FileSpreadsheet size={18} />
          Exportar Excel
        </button>
      </div>

      {/* 📊 Loader/Error */}
      {loading && <p className="text-center">🔄 Cargando...</p>}
      {error && <p className="text-center text-error">{error}</p>}

      {/* 🔢 Controles de paginación */}
      {!loading && registros.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Mostrar:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-secondary/20 border border-secondary/50 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-success"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-gray-400">registros por página</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 rounded bg-secondary/20 hover:bg-secondary/30 disabled:opacity-40 transition flex items-center justify-center"
              title="Página anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="font-semibold">
              Página {currentPage} de {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-secondary/20 hover:bg-secondary/30 disabled:opacity-40 transition flex items-center justify-center"
              title="Página siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 📋 Tabla desktop */}
      {!loading && registrosPaginados.length > 0 && (
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full bg-primary shadow-lg rounded-xl text-sm border border-secondary/40">
            <thead className="bg-secondary/40 text-text">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Técnico</th>
                <th className="px-3 py-2">Movimiento</th>
                <th className="px-3 py-2">Daño</th>
                <th className="px-3 py-2">Departamento</th>
                <th className="px-3 py-2">Registrado por</th>
                <th className="px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {registrosPaginados.map((r) => (
                <tr key={r.id} className="border-b border-secondary/30">
                  <td className="px-3 py-2">{r.herramienta_codigo}</td>
                  <td className="px-3 py-2">{r.herramienta_descripcion}</td>
                  <td className="px-3 py-2">{r.tecnico}</td>
                  <td className="px-3 py-2">{r.tipo_movimiento}</td>
                  <td className="px-3 py-2">{r.descripcion_dano || "-"}</td>
                  <td className="px-3 py-2">{r.departamento}</td>
                  <td className="px-3 py-2">{r.registrado_por}</td>
                  <td className="px-3 py-2">
                    {new Date(r.fecha).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📱 Vista móvil (tarjetas modernas) */}
      {!loading && (
        <div className="sm:hidden space-y-4">
          {registrosPaginados.map((r) => (
            <div
              key={r.id}
              className="bg-primary p-4 rounded-xl shadow-lg border border-secondary/40 text-sm transition hover:shadow-xl"
            >
              {/* Encabezado */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-success leading-tight">
                    {r.herramienta_descripcion}
                  </h3>
                  <p className="text-xs text-gray-400">{r.herramienta_codigo}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${r.tipo_movimiento === "Entrega"
                    ? "bg-success/20 text-success"
                    : r.tipo_movimiento === "Devolución"
                      ? "bg-warning/20 text-warning"
                      : "bg-secondary/30 text-text"
                    }`}
                >
                  {r.tipo_movimiento}
                </span>
              </div>

              {/* Cuerpo */}
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mt-2">
                <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                  <p className="font-semibold text-success">Técnico</p>
                  <p>{r.tecnico}</p>
                </div>
                <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                  <p className="font-semibold text-success">Departamento</p>
                  <p>{r.departamento}</p>
                </div>
                {r.descripcion_dano && (
                  <div className="col-span-2 bg-error/10 p-2 rounded-lg border border-error/30">
                    <p className="font-semibold text-error">Daño</p>
                    <p>{r.descripcion_dano}</p>
                  </div>
                )}
                <div className="col-span-2 bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                  <p className="font-semibold text-success">Registrado por</p>
                  <p>{r.registrado_por}</p>
                </div>
                <div className="col-span-2 bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                  <p className="font-semibold text-success">Fecha</p>
                  <p>{new Date(r.fecha).toLocaleString("es-AR")}</p>
                </div>
              </div>
            </div>
          ))}

          {registros.length === 0 && (
            <p className="text-center text-gray-400">
              No se encontraron movimientos con los filtros aplicados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
