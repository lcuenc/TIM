// src/pages/Tools.jsx
import { useEffect, useState } from "react";
import { getUser, isAuthenticated } from "../utils/auth";
import api from "../utils/api";
import { Edit3, Trash2, Wrench, Plus, X, Save, Check, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";


export default function Tools() {
  const [herramientas, setHerramientas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);


  // Filtros dinámicos
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState({
    id: "",
    codigo: "",
    descripcion: "",
    categoria: "Manual",
    numero_serie: "",
    fecha_incorporacion: "",
    estado: "Disponible",
    valor_usd: "",
    departamento_id: "",
    fecha_vencimiento: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const user = getUser();

  // 🔒 Validar acceso
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
    }
  }, []);

  // Obtener herramientas
  const fetchHerramientas = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tools");
      let data = res.data;

      if (user?.rol === "Abastecedor") {
        const userDeptos = user.departamentos || [];

        // Obtenemos arrays de nombres e IDs de los deptos del usuario
        const deptoNombres = userDeptos.map((d) => d.nombre);
        const deptoIds = userDeptos.map((d) => d.id);

        data = data.filter((h) => {
          // Si el backend devuelve string con nombre
          if (typeof h.departamento === "string") {
            return deptoNombres.includes(h.departamento);
          }
          // Si el backend devuelve número como ID
          if (h.departamento_id) {
            return deptoIds.includes(h.departamento_id);
          }
          return false;
        });
      }

      setHerramientas(data);
    } catch (err) {
      console.error("❌ Error al obtener herramientas:", err);
      setError("No se pudieron cargar las herramientas");
    } finally {
      setLoading(false);
    }
  };


  // Obtener departamentos
  const fetchDepartamentos = async () => {
    try {
      if (user?.rol === "Administrador") {
        const res = await api.get("/departamentos");
        setDepartamentos(res.data);
      } else if (user?.rol === "Supervisor") {
        // 🧠 Compatibilidad total: soporta ambos formatos
        const deps = user.departamentos?.map((d) =>
          typeof d === "object" ? d : { id: d.id || d, nombre: d.nombre || d }
        );
        setDepartamentos(deps || []);
      }
    } catch (err) {
      console.error("⚠️ Error al cargar departamentos:", err);
    }
  };

  useEffect(() => {
    fetchHerramientas();
    fetchDepartamentos();
  }, []);

  // 📦 Aplicar filtro proveniente del Dashboard (si existe)
  useEffect(() => {
    const filtroGuardado = localStorage.getItem("filtroEstadoDashboard");
    if (filtroGuardado) {
      console.log("🧭 Aplicando filtro desde Dashboard:", filtroGuardado);
      setFiltroEstado(filtroGuardado);

      // Limpiar el localStorage después de aplicarlo
      setTimeout(() => {
        localStorage.removeItem("filtroEstadoDashboard");
      }, 500);
    }
  }, []);


  // Crear o editar
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("🚀 handleSubmit disparado con form:", form);

    let departamentoFinal = form.departamento_id;

    if (user.rol === "Supervisor" && (user.departamento_ids || []).length === 1) {
      departamentoFinal = user.departamento_ids[0];
    }

    const departamentoIdNum = departamentoFinal ? Number(departamentoFinal) : null;
    console.log("📌 departamentoIdNum:", departamentoIdNum);

    try {
      if (editando) {
        console.log("✏️ Enviando actualización de herramienta ID:", editando);

        const formData = {
          ...form,
          valor_usd: Number(form.valor_usd) || 0,
          departamento_id: departamentoIdNum,
        };

        console.table(formData); // 👈 muestra el objeto en tabla legible

        const res = await api.put(`/tools/${editando}`, formData);
        console.log("📥 Respuesta actualización:", res.data);
        alert("✅ Herramienta actualizada");
      } else {
        const { id, codigo, ...rest } = form;
        const formData = {
          ...rest,
          valor_usd: Number(rest.valor_usd) || 0,
          departamento_id: departamentoIdNum,
        };

        console.table(formData); // 👈 muestra el objeto en tabla legible

        const res = await api.post("/tools", formData);
        console.log("📥 Respuesta creación:", res.data);
        alert(`✅ Herramienta creada con ID ${res.data.id}`);
      }

      // reset form
      setForm({
        id: "",
        codigo: "",
        descripcion: "",
        categoria: "Manual",
        numero_serie: "",
        fecha_incorporacion: "",
        estado: "Disponible",
        valor_usd: 0,
        departamento_id: "",
        fecha_vencimiento: "",
      });
      setEditando(null);
      fetchHerramientas();
    } catch (err) {
      console.error("❌ Error en handleSubmit:", err.response?.data || err.message);
      alert(
        "❌ Error al guardar: " +
        (err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message)
      );
    }
  };

  // Editar
  const handleEdit = (h) => {
    setForm({
      id: h.id,
      codigo: h.codigo,
      descripcion: h.descripcion,
      categoria: h.categoria,
      numero_serie: h.numero_serie,
      fecha_incorporacion: h.fecha_incorporacion
        ? new Date(h.fecha_incorporacion).toISOString().split("T")[0]
        : "",
      estado: h.estado,
      valor_usd: h.valor_usd,
      departamento_id: h.departamento_id ? Number(h.departamento_id) : "",
      fecha_vencimiento: h.fecha_vencimiento
        ? new Date(h.fecha_vencimiento).toISOString().split("T")[0]
        : "",
    });
    setEditando(h.id);
  };


  // Eliminar
  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que querés eliminar esta herramienta?")) return;
    try {
      await api.delete(`/tools/${id}`);
      alert("🗑️ Herramienta eliminada");
      fetchHerramientas();
    } catch (err) {
      console.error("❌ Error al eliminar herramienta:", err);
      alert("❌ Error al eliminar");
    }
  };

  // 📄 Paginación local
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 📌 Aplicar filtros combinados + búsqueda
  const herramientasFiltradas = herramientas.filter((h) => {
    const coincideBusqueda =
      !busqueda ||
      h.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      h.descripcion.toLowerCase().includes(busqueda.toLowerCase());

    return (
      coincideBusqueda &&
      (!filtroEstado || h.estado === filtroEstado) &&
      (!filtroCategoria || h.categoria === filtroCategoria) &&
      (!filtroDepto || h.departamento === filtroDepto)
    );
  });

  // 🔢 Datos paginados
  const totalPages = Math.ceil(herramientasFiltradas.length / pageSize);
  const herramientasPaginadas = herramientasFiltradas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 📥 Exportar con token en headers
  const handleExport = async (formato) => {
    try {
      const query = new URLSearchParams({
        formato,
        estado: filtroEstado,
        categoria: filtroCategoria,
        departamento: filtroDepto,
        busqueda,
      }).toString();

      const res = await fetch(`/api/tools/export?${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Error al exportar");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `herramientas.${formato === "csv" ? "csv" : "xlsx"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("❌ Error exportando archivo");
      console.error(err);
    }
  };

  return (
    <div className="p-6 text-text bg-background min-h-screen">

      {/* ================== Encabezado ================== */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Wrench size={26} className="text-success" /> Panel de Herramientas
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestioná, editá y controlá el estado de todas las herramientas del sistema
          </p>
          <div className="w-24 h-[2px] bg-success mt-3 rounded-full hidden sm:block" />
        </div>

        {user?.rol !== "Abastecedor" && (
          <button
            onClick={() => {
              setEditando(false);
              setForm({
                id: "",
                codigo: "",
                descripcion: "",
                categoria: "Manual",
                numero_serie: "",
                fecha_incorporacion: "",
                estado: "Disponible",
                valor_usd: "",
                departamento_id: "",
                fecha_vencimiento: "",
              });
              setShowModal(true);
            }}
            className="bg-success hover:bg-success/90 text-white px-5 py-2 rounded-lg shadow-md flex items-center gap-2 transition-transform hover:scale-105"
            title="Crear nueva herramienta"
          >
            <Plus size={18} />
            <span>Crear herramienta</span>
          </button>
        )}
      </div>

      {/* ================== Modal creación / edición ================== */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 overflow-y-auto p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-primary w-full max-w-3xl rounded-2xl shadow-2xl border border-secondary/40 p-6 relative mt-auto mb-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-100 sticky top-0 bg-primary py-2 z-10 border-b border-secondary/40 flex items-center justify-center gap-2">
              {editando ? (
                <>
                  <Edit3 size={22} className="text-success" />
                  Editar herramienta
                </>
              ) : (
                <>
                  <Plus size={22} className="text-success" />
                  Nueva herramienta
                </>
              )}
            </h2>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              {editando && (
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Código</label>
                  <input
                    type="text"
                    value={form.codigo}
                    disabled
                    className="p-3 rounded-lg bg-secondary/20 border border-secondary/50"
                  />
                </div>
              )}

              {/* Descripción */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                  required
                />
              </div>

              {/* Categoría */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                >
                  <option>Manual</option>
                  <option>Eléctrica</option>
                  <option>Hidráulica</option>
                  <option>Neumática</option>
                  <option>Accesorio</option>
                  <option>Izaje/Amarre</option>
                  <option>Instrumento</option>
                  <option>Roscado</option>
                </select>
              </div>

              {/* Número de serie */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Número de serie</label>
                <input
                  type="text"
                  value={form.numero_serie}
                  onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Fecha de alta */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Fecha de alta</label>
                <input
                  type="date"
                  value={form.fecha_incorporacion}
                  onChange={(e) => setForm({ ...form, fecha_incorporacion: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                  required
                />
              </div>

              {/* Estado */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                >
                  <option>Disponible</option>
                  <option>Prestada</option>
                  <option>Mantenimiento</option>
                  <option>Baja</option>
                </select>
              </div>

              {/* Valor USD */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Valor (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_usd}
                  onChange={(e) => setForm({ ...form, valor_usd: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Fecha de vencimiento */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                />
              </div>

              {/* Departamento */}
              {(user?.rol === "Administrador" || user?.rol === "Supervisor") && (
                <div className="flex flex-col col-span-2">
                  <label className="font-semibold mb-1">Departamento</label>
                  <select
                    value={form.departamento_id}
                    onChange={(e) => setForm({ ...form, departamento_id: parseInt(e.target.value) })}
                    className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
                    required
                  >
                    <option value="">-- Seleccionar departamento --</option>
                    {departamentos.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botones */}
              <div className="col-span-full flex flex-col sm:flex-row justify-end gap-3 mt-6 sticky bottom-0 bg-primary pt-3 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 transition"
                  title="Cancelar creación o edición"
                >
                  <X size={18} />
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 flex items-center justify-center gap-2 transition"
                  title={editando ? "Guardar cambios" : "Crear herramienta"}
                >
                  {editando ? <Save size={18} /> : <Check size={18} />}
                  {editando ? "Guardar cambios" : "Crear herramienta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================== Filtros y búsqueda ================== */}
      <div className="flex flex-wrap gap-4 mb-6 items-end justify-center bg-primary p-4 rounded-lg shadow border border-secondary/40">
        {/* Estado */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
          >
            <option value="">Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="Prestada">Prestada</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        {/* Categoría */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Categoría</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
          >
            <option value="">Todas</option>
            <option>Manual</option>
            <option>Eléctrica</option>
            <option>Hidráulica</option>
            <option>Neumatica</option>
            <option>Accesorio</option>
            <option>Izaje/Amarre</option>
            <option>Instrumento</option>
            <option>Roscado</option>
          </select>
        </div>

        {/* Departamento */}
        {user?.rol !== "Abastecedor" && (
          <div className="flex flex-col">
            <label className="font-semibold mb-1">Departamento</label>
            <select
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
              className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
            >
              <option value="">Todos</option>
              {departamentos.map((dep) => (
                <option key={dep.id} value={dep.nombre}>
                  {dep.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buscador */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="font-semibold mb-1">Buscar</label>
          <input
            type="text"
            placeholder="Código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
          />
        </div>

        {/* Botón limpiar */}
        {(filtroEstado || filtroCategoria || filtroDepto || busqueda) && (
          <button
            onClick={() => {
              setFiltroEstado("");
              setFiltroCategoria("");
              setFiltroDepto("");
              setBusqueda("");
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition h-fit"
            title="Limpiar filtros"
          >
            <X size={18} />
            Limpiar
          </button>
        )}
      </div>

      {/* 📥 Exportar */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => handleExport("csv")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
          title="Exportar datos a CSV"
        >
          <FileText size={18} />
          Exportar CSV
        </button>

        <button
          onClick={() => handleExport("xlsx")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
          title="Exportar datos a Excel"
        >
          <FileSpreadsheet size={18} />
          Exportar Excel
        </button>
      </div>

      {/* 🔢 Controles de paginación */}
      {!loading && herramientasFiltradas.length > 0 && (
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
            <span className="text-gray-400">herramientas por página</span>
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


      {/* ================== Listado ================== */}
      {!loading && (
        <>
          {/* 💻 Desktop → tabla (mantiene vista detallada) */}
          <div className="hidden sm:block">
            <table className="w-full bg-primary shadow-lg rounded-xl text-sm border border-secondary/40">
              <thead className="bg-secondary/40 text-text">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">N° Serie</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Vencimiento</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Valor (USD)</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Último Usuario</th>
                  <th className="p-3">Fecha Alta</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {herramientasPaginadas.map((h) => (
                  <tr key={h.id} className="border-b border-secondary/30 hover:bg-secondary/10">
                    <td className="p-3">{h.codigo}</td>
                    <td className="p-3">{h.descripcion}</td>
                    <td className="p-3">{h.numero_serie || "-"}</td>
                    <td className="p-3">{h.categoria}</td>
                    <td className="p-3">
                      {h.fecha_vencimiento
                        ? new Date(h.fecha_vencimiento).toISOString().split("T")[0]
                        : "-"}
                    </td>
                    <td className="p-3">{h.estado}</td>
                    <td className="p-3">${h.valor_usd || "0.00"}</td>
                    <td className="p-3">{h.departamento}</td>
                    <td className="p-3">{h.ultimo_usuario || "-"}</td>
                    <td className="p-3">
                      {h.fecha_incorporacion
                        ? new Date(h.fecha_incorporacion).toISOString().split("T")[0]
                        : "-"}
                    </td>
                    <td className="p-3 flex gap-2">
                      {user?.rol !== "Abastecedor" && (
                        <>
                          <button
                            onClick={() => {
                              setEditando(true);
                              setForm({
                                ...h,
                                fecha_incorporacion: h.fecha_incorporacion
                                  ? new Date(h.fecha_incorporacion).toISOString().split("T")[0]
                                  : "",
                                fecha_vencimiento: h.fecha_vencimiento
                                  ? new Date(h.fecha_vencimiento).toISOString().split("T")[0]
                                  : "",
                              });
                              setShowModal(true);
                            }}
                            className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                            title="Editar herramienta"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                            title="Eliminar herramienta"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {herramientasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="11" className="text-center p-6">
                      No se encontraron herramientas con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 📱 Mobile → tarjetas modernas */}
          <div className="sm:hidden space-y-4">
            {herramientasPaginadas.map((h) => (
              <div
                key={h.id}
                className="bg-primary p-4 rounded-xl shadow-lg border border-secondary/40 text-sm relative"
              >
                {/* Encabezado */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-success leading-tight">
                      {h.descripcion}
                    </h3>
                    <p className="text-xs text-gray-400">{h.codigo}</p>
                  </div>

                  {user?.rol !== "Abastecedor" && (
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => {
                          setEditando(true);
                          setForm({
                            ...h,
                            fecha_incorporacion: h.fecha_incorporacion
                              ? new Date(h.fecha_incorporacion).toISOString().split("T")[0]
                              : "",
                            fecha_vencimiento: h.fecha_vencimiento
                              ? new Date(h.fecha_vencimiento).toISOString().split("T")[0]
                              : "",
                          });
                          setShowModal(true);
                        }}
                        title="Editar herramienta"
                        className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        title="Eliminar herramienta"
                        className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Datos */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mt-2">
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Categoría</p>
                    <p>{h.categoria}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Estado</p>
                    <p>{h.estado}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Vencimiento</p>
                    <p>
                      {h.fecha_vencimiento
                        ? new Date(h.fecha_vencimiento).toISOString().split("T")[0]
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                    <p className="font-semibold text-success">Valor (USD)</p>
                    <p>${h.valor_usd || "0.00"}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20 col-span-2">
                    <p className="font-semibold text-success">Departamento</p>
                    <p>{h.departamento}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20 col-span-2">
                    <p className="font-semibold text-success">Último Usuario</p>
                    <p>{h.ultimo_usuario || "-"}</p>
                  </div>
                </div>
              </div>
            ))}

            {herramientasFiltradas.length === 0 && (
              <p className="text-center text-gray-400">
                No se encontraron herramientas con los filtros aplicados.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
