// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { getUser, isAuthenticated } from "../utils/auth";
import api from "../utils/api";
import { UserCog, Edit3, Trash2, Plus, Save, X, Building2, Check } from "lucide-react";

export default function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);

  // 📌 Formularios
  const [form, setForm] = useState({
    id: null,
    nombre: "",
    usuario: "",
    password: "",
    rol: "Abastecedor",
    departamentos: [],
    email: "",
  });

  const [formDepto, setFormDepto] = useState({ id: null, nombre: "" });

  // 📌 Filtros
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const user = getUser();

  // 🔒 Validar acceso
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
    } else if (user?.rol !== "Administrador") {
      alert("❌ Acceso denegado. Solo Administradores.");
      window.location.href = "/";
    }
  }, [user]);

  // ================== FETCH ==================
  const fetchUsuarios = async () => {
    try {
      const res = await api.get("/usuarios");
      setUsuarios(res.data);
    } catch (err) {
      console.error("❌ Error en fetchUsuarios:", err);
      setError("No se pudieron cargar los usuarios");
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const res = await api.get("/departamentos");
      setDepartamentos(res.data);
    } catch (err) {
      console.error("❌ Error en fetchDepartamentos:", err);
    }
  };

  useEffect(() => {
    const cargar = async () => {
      if (user?.rol === "Administrador") {
        await Promise.all([fetchUsuarios(), fetchDepartamentos()]);
        setLoading(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================== HANDLERS ==================
  const handleChange = (e) => {
    const { name, value, multiple, selectedOptions } = e.target;
    if (multiple) {
      setForm({
        ...form,
        [name]: Array.from(selectedOptions, (opt) => opt.value),
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/usuarios/${form.id}`, form);
        alert("✅ Usuario actualizado");
      } else {
        await api.post("/usuarios", form);
        alert("✅ Usuario creado");
      }
      resetForm();
      setMostrarModalUsuario(false);
      fetchUsuarios();
    } catch (err) {
      console.error("❌ Error en handleSubmit:", err);
      alert("❌ Error al guardar usuario");
    }
  };

  const handleEdit = (u) => {
    setForm({
      id: u.id,
      nombre: u.nombre || "",
      usuario: u.usuario,
      password: "",
      rol: u.rol,
      departamentos: u.departamento_ids || [],
      email: u.email || "",
    });
    setMostrarModalUsuario(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este usuario?")) return;
    try {
      await api.delete(`/usuarios/${id}`);
      alert("🗑️ Usuario eliminado");
      fetchUsuarios();
    } catch (err) {
      console.error("❌ Error en handleDelete:", err);
      alert("❌ Error al eliminar usuario");
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      nombre: "",
      usuario: "",
      password: "",
      rol: "Abastecedor",
      departamentos: [],
      email: "",
    });
  };

  // ================== DEPARTAMENTOS ==================
  const handleSubmitDepto = async (e) => {
    e.preventDefault();
    try {
      if (formDepto.id) {
        await api.put(`/departamentos/${formDepto.id}`, formDepto);
        alert("✅ Departamento actualizado");
      } else {
        await api.post("/departamentos", formDepto);
        alert("✅ Departamento creado");
      }
      resetFormDepto();
      fetchDepartamentos();
    } catch (err) {
      console.error("❌ Error en handleSubmitDepto:", err);
      alert("❌ Error al guardar departamento");
    }
  };

  const handleEditDepto = (d) => setFormDepto({ id: d.id, nombre: d.nombre });

  const handleDeleteDepto = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este departamento?")) return;
    try {
      await api.delete(`/departamentos/${id}`);
      alert("🗑️ Departamento eliminado");
      fetchDepartamentos();
    } catch (err) {
      console.error("❌ Error en handleDeleteDepto:", err);
      alert("❌ Error al eliminar departamento");
    }
  };

  const resetFormDepto = () => setFormDepto({ id: null, nombre: "" });

  // ================== UX MODAL ==================
  useEffect(() => {
    if (mostrarModalUsuario) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mostrarModalUsuario]);

  useEffect(() => {
    if (!mostrarModalUsuario) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        resetForm();
        setMostrarModalUsuario(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mostrarModalUsuario]);

  // ================== FILTROS ==================
  const totalAbastecedores = usuarios.filter((u) => u.rol === "Abastecedor").length;
  const totalSupervisores = usuarios.filter((u) => u.rol === "Supervisor").length;
  const totalAdmins = usuarios.filter((u) => u.rol === "Administrador").length;

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideBusqueda =
      !busqueda || u.usuario.toLowerCase().includes(busqueda.toLowerCase());
    const coincideRol = !filtroRol || u.rol === filtroRol;
    const coincideDepto = !filtroDepto || (u.departamentos || "").includes(filtroDepto);
    return coincideBusqueda && coincideRol && coincideDepto;
  });

  if (loading) return <p className="p-6 text-text">🔄 Cargando datos...</p>;
  if (error) return <p className="p-6 text-error">{error}</p>;

  // ================== RENDER ==================
  return (
    <div className="p-6 space-y-10 text-text bg-background min-h-screen">
      {/* ==================== Usuarios ==================== */}
      <div>
        {/* ================== Encabezado ================== */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
              <UserCog size={26} className="text-success" /> Panel de Administración
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Gestioná usuarios, roles y departamentos del sistema
            </p>
            <div className="w-24 h-[2px] bg-success mt-3 rounded-full hidden sm:block" />
          </div>

          <button
            onClick={() => {
              resetForm();
              setMostrarModalUsuario(true);
            }}
            className="bg-success hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            title="Crear nuevo usuario"
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>


        {/* 📊 Conteo de usuarios + Filtros */}
        <div className="bg-primary p-6 rounded-xl shadow border border-secondary/40 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-lg font-bold">Abastecedores</p>
              <p className="text-2xl text-success">{totalAbastecedores}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Supervisores</p>
              <p className="text-2xl text-warning">{totalSupervisores}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Administradores</p>
              <p className="text-2xl text-error">{totalAdmins}</p>
            </div>
          </div>

          {/* ================== Filtros ================== */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
              <label className="font-semibold mb-1">Rol</label>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
              >
                <option value="">Todos</option>
                <option value="Abastecedor">Abastecedor</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

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

            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="font-semibold mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Nombre de usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 focus:ring-2 focus:ring-success"
              />
            </div>

            {(filtroRol || filtroDepto || busqueda) && (
              <button
                onClick={() => {
                  setFiltroRol("");
                  setFiltroDepto("");
                  setBusqueda("");
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition h-fit"
              >
                ❌ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ================== Listado ================== */}
        {usuariosFiltrados.length === 0 ? (
          <p className="text-center text-gray-400">No hay usuarios registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {usuariosFiltrados.map((u) => (
              <div
                key={u.id}
                className="relative bg-primary p-5 rounded-xl shadow-lg border border-secondary/40 hover:shadow-xl transition-all duration-300"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-success leading-tight">
                      {u.nombre || "Sin nombre"}
                    </h3>
                    <p className="text-sm text-gray-400">@{u.usuario}</p>
                  </div>

                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleEdit(u)}
                      title="Editar usuario"
                      className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      title="Eliminar usuario"
                      className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="text-sm space-y-1 mt-2">
                  <p>
                    <span className="font-semibold text-gray-300">Rol:</span>{" "}
                    <span
                      className={
                        u.rol === "Administrador"
                          ? "text-error font-semibold"
                          : u.rol === "Supervisor"
                            ? "text-warning font-semibold"
                            : "text-success font-semibold"
                      }
                    >
                      {u.rol}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-300">Email:</span>{" "}
                    {u.email || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-300">Departamentos:</span>{" "}
                    {Array.isArray(u.departamentos)
                      ? u.departamentos.join(", ")
                      : u.departamentos || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ==================== Departamentos ==================== */}
      <div>
        {/* ================== Encabezado Departamentos ================== */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
              <Building2 size={26} className="text-success" /> Gestión de Departamentos
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Creá y editá los departamentos que asignaras a cada usuario
            </p>
            <div className="w-24 h-[2px] bg-success mt-3 rounded-full hidden sm:block" />
          </div>
        </div>

        <form
          onSubmit={handleSubmitDepto}
          className="bg-primary p-4 shadow-lg rounded-xl border border-secondary/40 mb-8 flex gap-3"
        >
          <input
            type="text"
            placeholder="Nombre del departamento"
            value={formDepto.nombre}
            onChange={(e) =>
              setFormDepto({ ...formDepto, nombre: e.target.value })
            }
            className="p-3 flex-1 rounded-lg bg-secondary/20 border border-secondary/50 focus:outline-none focus:ring-2 focus:ring-success"
            required
          />

          <button
            type="submit"
            className="bg-success hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            title={formDepto.id ? "Guardar cambios" : "Crear departamento"}
          >
            {formDepto.id ? <Save size={18} /> : <Plus size={18} />}
            {formDepto.id ? "Guardar" : "Crear"}
          </button>

          {formDepto.id && (
            <button
              type="button"
              onClick={resetFormDepto}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
              title="Cancelar edición"
            >
              <X size={18} />
              Cancelar
            </button>
          )}
        </form>

        {departamentos.length === 0 ? (
          <p className="text-center">No hay departamentos registrados.</p>
        ) : (
          <ul className="space-y-3">
            {departamentos.map((d) => (
              <li
                key={d.id}
                className="bg-primary shadow p-4 rounded-lg border border-secondary/40 flex justify-between items-center"
              >
                <span>{d.nombre}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditDepto(d)}
                    className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-full transition-all duration-200"
                    title="Editar departamento"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteDepto(d.id)}
                    className="p-2 bg-error/20 hover:bg-error/30 text-error rounded-full transition-all duration-200"
                    title="Eliminar departamento"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🧩 Modal Crear/Editar Usuario */}
      {mostrarModalUsuario && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            resetForm();
            setMostrarModalUsuario(false);
          }}
        >
          <div
            className="bg-primary p-8 rounded-xl shadow-lg border border-secondary/50 w-full max-w-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center gap-2 text-gray-100">
              {form.id ? (
                <>
                  <Edit3 size={20} className="text-success" />
                  Editar Usuario
                </>
              ) : (
                <>
                  <Plus size={20} className="text-success" />
                  Nuevo Usuario
                </>
              )}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="nombre"
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full focus:outline-none focus:ring-2 focus:ring-success"
                required
              />

              <input
                type="text"
                name="usuario"
                placeholder="Usuario"
                value={form.usuario}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full focus:outline-none focus:ring-2 focus:ring-success"
                required
              />

              <input
                type="password"
                name="password"
                placeholder={form.id ? "Nueva contraseña (opcional)" : "Contraseña"}
                value={form.password}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full focus:outline-none focus:ring-2 focus:ring-success"
                required={!form.id}
              />

              <input
                type="email"
                name="email"
                placeholder="Email (opcional)"
                value={form.email || ""}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full focus:outline-none focus:ring-2 focus:ring-success"
              />

              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full focus:outline-none focus:ring-2 focus:ring-success"
              >
                <option value="Abastecedor">Abastecedor</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Administrador">Administrador</option>
              </select>

              <select
                name="departamentos"
                multiple
                value={form.departamentos.map(String)}
                onChange={handleChange}
                className="p-3 rounded-lg bg-secondary/20 border border-secondary/50 w-full h-32 focus:outline-none focus:ring-2 focus:ring-success"
              >
                {departamentos.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nombre}
                  </option>
                ))}
              </select>

              <div className="flex justify-between mt-6">
                <button
                  type="submit"
                  className="bg-success hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                  title={form.id ? "Actualizar usuario" : "Crear usuario"}
                >
                  {form.id ? <Save size={18} /> : <Check size={18} />}
                  {form.id ? "Actualizar" : "Crear"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMostrarModalUsuario(false);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                  title="Cerrar formulario"
                >
                  <X size={18} />
                  Cerrar
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
