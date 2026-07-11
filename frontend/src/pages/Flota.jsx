import { useEffect, useState } from "react";
import api from "../utils/api";
import { getUser, isAuthenticated } from "../utils/auth";
import { Car, Edit3, Trash2, Plus, X, Save, Check, ChevronLeft, ChevronRight } from "lucide-react";

export default function Flota() {
  const [vehiculos, setVehiculos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({
    id: null,
    interno: "",
    chasis: "",
    dominio: "",
    marca: "",
    modelo: "",
    departamento_id: "",
    fecha_vtv: "",
    fecha_matafuego: "",
    fecha_lavado: "",
    fecha_seguro: "",
  });

  // 📄 Paginación local
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(vehiculos.length / pageSize);
  const vehiculosPaginados = vehiculos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );


  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/";
      return;
    }
    cargarDepartamentos();
    cargarVehiculos();
  }, []);

  const cargarDepartamentos = async () => {
    try {
      const res = await api.get("/departamentos");
      setDepartamentos(res.data);
    } catch (err) {
      console.error("❌ Error al cargar departamentos:", err);
    }
  };

  const cargarVehiculos = async () => {
    try {
      const res = await api.get("/flota");
      setVehiculos(res.data);
    } catch (err) {
      console.error("❌ Error al cargar flota:", err);
      setError("No se pudieron cargar los vehículos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/flota/${form.id}`, form);
      } else {
        await api.post("/flota", form);
      }
      setShowModal(false);
      cargarVehiculos();
      resetForm();
    } catch (err) {
      console.error("❌ Error al guardar vehículo:", err);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      interno: "",
      chasis: "",
      dominio: "",
      marca: "",
      modelo: "",
      departamento_id: "",
      fecha_vtv: "",
      fecha_matafuego: "",
      fecha_lavado: "",
    });
    setEditando(false);
  };

  const handleEdit = (v) => {
    // 🧩 Convertir fechas a formato YYYY-MM-DD
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      // Asegura zona horaria y formato ISO corto
      return date.toISOString().split("T")[0];
    };

    setForm({
      ...v,
      fecha_vtv: formatDate(v.fecha_vtv),
      fecha_matafuego: formatDate(v.fecha_matafuego),
      fecha_lavado: formatDate(v.fecha_lavado),
      fecha_seguro: formatDate(v.fecha_seguro),
    });

    setEditando(true);
    setShowModal(true);
  };


  const handleDelete = async (id) => {
    if (confirm("¿Seguro que querés eliminar este vehículo?")) {
      await api.delete(`/flota/${id}`);
      cargarVehiculos();
    }
  };

  const calcularDiasRestantes = (fecha, tipo) => {
    if (!fecha) return "-";
    const hoy = new Date();
    const fechaControl = new Date(fecha);
    const diff = (fechaControl - hoy) / (1000 * 60 * 60 * 24);

    // 🔹 Lógica especial para lavado
    if (tipo === "lavado") {
      const diasDesdeLavado = Math.floor((hoy - fechaControl) / (1000 * 60 * 60 * 24));
      const diasFaltantes = 14 - diasDesdeLavado;

      if (diasFaltantes > 0) return `Faltan ${diasFaltantes} días`;
      if (diasFaltantes === 0) return "Hoy se cumplen 14 días";
      return `Vencido hace ${Math.abs(diasFaltantes)} días`;
    }

    // 🔹 Lógica normal para VTV y Matafuego
    if (diff > 0) return `${Math.ceil(diff)} días`;
    return "Vencido";
  };

  return (
    <div className="p-6 relative">
      {/* ================== Encabezado ================== */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-6 sm:gap-0">
        {/* Título */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Car size={28} className="text-success drop-shadow-sm" />

            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              Panel de Flota
            </h1>
          </div>

          <p className="text-gray-400 text-sm mt-2">
            Gestioná y controlá el estado general de los vehículos del taller
          </p>

          <div className="w-24 h-[2px] bg-success mt-3 rounded-full hidden sm:block" />
        </div>

        {/* Botón Crear Vehículo */}
        {user?.rol !== "Abastecedor" && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-success hover:bg-success/90 text-white px-5 py-2.5 rounded-lg shadow-md font-semibold transition-all hover:scale-105 active:scale-95"
            title="Crear nuevo vehículo"
          >
            <Plus size={20} />
            <span>Crear Vehículo</span>
          </button>
        )}
      </div>

      {/* 🔢 Controles de paginación */}
      {!loading && vehiculos.length > 0 && (
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
            <span className="text-gray-400">vehículos por página</span>
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


      {/* ================== Listado de vehículos ================== */}
      {loading ? (
        <p>Cargando flota...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {/* 🖥️ Vista Desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto bg-primary p-4 rounded-xl shadow-md border border-secondary/40">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="p-3 text-left">Interno</th>
                  <th className="p-3 text-left">Dominio</th>
                  <th className="p-3 text-left">Marca / Modelo</th>
                  <th className="p-3 text-left">Depto</th>
                  <th className="p-3 text-left">VTV</th>
                  <th className="p-3 text-left">Seguro</th>
                  <th className="p-3 text-left">Matafuego</th>
                  <th className="p-3 text-left">Lavado</th>
                  {user?.rol !== "Abastecedor" && (
                    <th className="p-3 text-left">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {vehiculosPaginados.map((v) => (
                  <tr key={v.id} className="border-b border-secondary/30 hover:bg-secondary/10">
                    <td className="p-3 font-semibold">{v.interno}</td>
                    <td className="p-3">{v.dominio || "-"}</td>
                    <td className="p-3">{v.marca} {v.modelo}</td>
                    <td className="p-3">{v.departamento_nombre}</td>
                    <td className="p-3">{calcularDiasRestantes(v.fecha_vtv)}</td>
                    <td className="p-3">{calcularDiasRestantes(v.fecha_seguro)}</td>
                    <td className="p-3">{calcularDiasRestantes(v.fecha_matafuego)}</td>
                    <td className="p-3">{calcularDiasRestantes(v.fecha_lavado, "lavado")}</td>
                    {user?.rol !== "Abastecedor" && (
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                          title="Editar vehículo"
                        >
                          <Edit3 size={18} />
                        </button>

                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                          title="Eliminar vehículo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📱 Vista Mobile - Tarjetas */}
          <div className="sm:hidden space-y-4">
            {vehiculosPaginados.map((v) => (
              <div
                key={v.id}
                className="bg-primary p-4 rounded-xl shadow-lg border border-secondary/40 text-sm transition hover:shadow-xl"
              >
                {/* Encabezado de tarjeta */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-success leading-tight">
                      #{v.interno} — {v.marca} {v.modelo}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {v.dominio || "Sin dominio"} · {v.departamento_nombre}
                    </p>
                  </div>

                  {/* Botones de acción */}
                  {user?.rol !== "Abastecedor" && (
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleEdit(v)}
                        title="Editar vehículo"
                        className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        title="Eliminar vehículo"
                        className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Datos técnicos */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mt-2">
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">VTV</p>
                    <p>{calcularDiasRestantes(v.fecha_vtv)}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Seguro</p>
                    <p>{calcularDiasRestantes(v.fecha_seguro)}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Matafuego</p>
                    <p>{calcularDiasRestantes(v.fecha_matafuego)}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Lavado</p>
                    <p>{calcularDiasRestantes(v.fecha_lavado, "lavado")}</p>
                  </div>
                </div>
              </div>
            ))}

            {vehiculos.length === 0 && (
              <p className="text-center text-gray-400">No hay vehículos cargados.</p>
            )}
          </div>

        </>
      )}

      {/* Modal flotante optimizado */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 overflow-y-auto p-4"
          onClick={() => {
            resetForm();
            setShowModal(false);
          }}
        >
          <div
            className="bg-primary w-full max-w-3xl rounded-2xl shadow-2xl border border-secondary/40 p-6 relative mt-auto mb-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-100 sticky top-0 bg-primary py-2 z-10 border-b border-secondary/40">
              {editando ? (
                <>
                  <Edit3 size={22} className="inline-block mr-2 text-success" />
                  Editar Vehículo
                </>
              ) : (
                <>
                  <Plus size={22} className="inline-block mr-2 text-success" />
                  Nuevo Vehículo
                </>
              )}
            </h2>

            {/* Formulario */}
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4"
            >
              {/* Interno */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Número Interno</label>
                <input
                  type="text"
                  placeholder="Ej: 120"
                  value={form.interno}
                  onChange={(e) => setForm({ ...form, interno: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                  required
                />
              </div>

              {/* Dominio */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Dominio / Patente</label>
                <input
                  type="text"
                  placeholder="Ej: AB123CD"
                  value={form.dominio}
                  onChange={(e) => setForm({ ...form, dominio: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Chasis */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Número de Chasis</label>
                <input
                  type="text"
                  placeholder="Ej: 8A1ZZZ12345678901"
                  value={form.chasis}
                  onChange={(e) => setForm({ ...form, chasis: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Marca */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Marca</label>
                <input
                  type="text"
                  placeholder="Ej: Toyota"
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Modelo */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Modelo</label>
                <input
                  type="text"
                  placeholder="Ej: Hilux 4x4"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Departamento */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1 text-sm">Departamento</label>
                <select
                  value={form.departamento_id}
                  onChange={(e) => setForm({ ...form, departamento_id: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                >
                  <option value="">Seleccionar Departamento</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fechas */}
              {[
                { label: "Fecha de VTV / RTO", key: "fecha_vtv" },
                { label: "Fecha de Venc. Seguro", key: "fecha_seguro" },
                { label: "Fecha de Venc. Matafuego", key: "fecha_matafuego" },
                { label: "Próximo Lavado", key: "fecha_lavado" },
              ].map(({ label, key }) => (
                <div className="flex flex-col" key={key}>
                  <label className="font-semibold mb-1 text-sm">{label}</label>
                  <input
                    type="date"
                    value={form[key] || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                  />
                </div>
              ))}

              {/* Botones */}
              <div className="col-span-full flex flex-col sm:flex-row justify-end gap-3 mt-6 sticky bottom-0 bg-primary pt-3 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 transition"
                  title="Cancelar"
                >
                  <X size={18} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 flex items-center justify-center gap-2 transition font-semibold"
                  title={editando ? "Actualizar vehículo" : "Guardar vehículo"}
                >
                  {editando ? <Save size={18} /> : <Check size={18} />}
                  {editando ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
