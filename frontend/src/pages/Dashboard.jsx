import { useEffect, useState } from "react";
import api from "../utils/api";
import { getUser } from "../utils/auth";
import {
  Wrench,
  ClipboardList,
  Settings,
  BarChart3,
  DollarSign,
} from "lucide-react";

export default function Dashboard({ setPage }) {
  const [data, setData] = useState({
    disponibles: 0,
    prestadas: 0,
    mantenimiento: 0,
    baja: 0,
    valorTotal: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const user = getUser();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      const d = res.data || {};
      const total =
        (Number(d.disponibles) || 0) +
        (Number(d.prestadas) || 0) +
        (Number(d.mantenimiento) || 0) +
        (Number(d.baja) || 0);
      setData({
        disponibles: Number(d.disponibles) || 0,
        prestadas: Number(d.prestadas) || 0,
        mantenimiento: Number(d.mantenimiento) || 0,
        baja: Number(d.baja) || 0,
        valorTotal: Number(d.valorTotal) || 0,
        total,
      });
      setLastUpdate(new Date());
    } catch (err) {
      console.error("❌ Error al cargar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goToToolsWithFilter = (estado) => {
    localStorage.setItem("filtroEstadoDashboard", estado);
    setPage("tools");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-text">
        <div className="animate-pulse text-center">
          <p className="text-xl font-semibold">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-text bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* ================== Encabezado ================== */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <BarChart3 className="text-success" /> Panel General
          </h1>
          <p className="text-gray-400 text-sm">
            Departamentos asignados:&nbsp;
            <span className="font-semibold text-success">
              {user?.departamentos?.map((d) => d.nombre).join(", ") || "Ninguno"}
            </span>
          </p>
        </div>

        {/* ================== KPIs Principales ================== */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-visible">
          {[
            {
              label: "Disponibles",
              value: data.disponibles,
              color: "text-green-400 border-green-400/40 bg-green-500/10",
              icon: <Wrench size={22} />,
            },
            {
              label: "Prestadas",
              value: data.prestadas,
              color: "text-blue-400 border-blue-400/40 bg-blue-500/10",
              icon: <ClipboardList size={22} />,
            },
            {
              label: "Mantenimiento",
              value: data.mantenimiento,
              color: "text-orange-400 border-orange-400/40 bg-orange-500/10",
              icon: <Settings size={22} />,
            },
            {
              label: "Baja",
              value: data.baja,
              color: "text-red-400 border-red-400/40 bg-red-500/10",
              icon: <BarChart3 size={22} />,
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className={`min-w-[200px] snap-center border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:scale-105 hover:shadow-lg transition-all duration-300 ${kpi.color}`}
            >
              <div className="p-3 bg-white/10 rounded-full mb-3">{kpi.icon}</div>
              <h2 className="text-lg font-medium opacity-90">{kpi.label}</h2>
              <p className="text-3xl font-bold mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ================== KPIs Secundarios ================== */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total */}
          <div className="bg-primary border border-secondary/50 rounded-xl p-6 shadow-md text-center">
            <h2 className="text-lg font-semibold opacity-80 mb-1">
              Total de Herramientas
            </h2>
            <p className="text-3xl font-bold text-success">{data.total}</p>
          </div>

          {/* % Ocupación */}
          <button
            onClick={() => goToToolsWithFilter("Prestada")}
            className="bg-blue-500/10 border border-blue-400/50 rounded-xl p-6 shadow-md text-center hover:bg-blue-500/20 transition-all duration-300"
          >
            <h2 className="text-lg font-semibold opacity-80 mb-1">% Ocupación</h2>
            <p className="text-3xl font-bold text-blue-400">
              {data.total > 0
                ? ((data.prestadas / data.total) * 100).toFixed(1)
                : 0}
              %
            </p>
            <div className="mt-3 w-full bg-secondary/30 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-400 transition-all duration-500"
                style={{
                  width: `${
                    data.total > 0
                      ? ((data.prestadas / data.total) * 100).toFixed(1)
                      : 0
                  }%`,
                }}
              />
            </div>
          </button>

          {/* % Indisponibilidad */}
          <button
            onClick={() => goToToolsWithFilter("Mantenimiento")}
            className="bg-orange-500/10 border border-orange-400/50 rounded-xl p-6 shadow-md text-center hover:bg-orange-500/20 transition-all duration-300"
          >
            <h2 className="text-lg font-semibold opacity-80 mb-1">
              % Indisponibilidad
            </h2>
            <p className="text-3xl font-bold text-orange-400">
              {data.total > 0
                ? ((data.mantenimiento / data.total) * 100).toFixed(1)
                : 0}
              %
            </p>
            <div className="mt-3 w-full bg-secondary/30 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-orange-400 transition-all duration-500"
                style={{
                  width: `${
                    data.total > 0
                      ? ((data.mantenimiento / data.total) * 100).toFixed(1)
                      : 0
                  }%`,
                }}
              />
            </div>
          </button>

          {/* % Disponibilidad */}
          <button
            onClick={() => goToToolsWithFilter("Disponible")}
            className="bg-green-500/10 border border-green-400/50 rounded-xl p-6 shadow-md text-center hover:bg-green-500/20 transition-all duration-300"
          >
            <h2 className="text-lg font-semibold opacity-80 mb-1">% Disponibilidad</h2>
            <p className="text-3xl font-bold text-green-400">
              {data.total > 0
                ? ((data.disponibles / data.total) * 100).toFixed(1)
                : 0}
              %
            </p>
            <div className="mt-3 w-full bg-secondary/30 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-400 transition-all duration-500"
                style={{
                  width: `${
                    data.total > 0
                      ? ((data.disponibles / data.total) * 100).toFixed(1)
                      : 0
                  }%`,
                }}
              />
            </div>
          </button>
        </div>

        {/* ================== Valor total ================== */}
        <div className="mt-10 bg-yellow-500/10 border border-yellow-400/40 rounded-xl p-6 shadow-md text-center hover:bg-yellow-500/20 transition">
          <h2 className="text-lg font-semibold opacity-80 mb-1 flex items-center justify-center gap-2">
            <DollarSign size={20} /> Valor total del inventario (USD)
          </h2>
          <p className="text-3xl font-bold text-yellow-400">
            ${data.valorTotal?.toFixed(2) || 0}
          </p>
        </div>

        {/* 🕓 Última actualización */}
        {lastUpdate && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Última actualización: {lastUpdate.toLocaleTimeString("es-AR")}
          </p>
        )}
      </div>
    </div>
  );
}
