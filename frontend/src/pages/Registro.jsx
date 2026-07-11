import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Quagga from "quagga";
import ButtonLarge from "../components/ButtonLarge";
import api from "../utils/api";
import { BarChart3, Camera, CheckCircle2, CameraOff, Package, Repeat2, AlertTriangle, Wrench, XCircle, X, ArrowLeftCircle } from "lucide-react";

// 🧠 Control global para evitar que se abra la cámara QR más de una vez a la vez
let qrBusy = false;

export default function Registro() {
  const [tecnico, setTecnico] = useState("");
  const [tecnicoConfirmado, setTecnicoConfirmado] = useState(false);
  const [tipo, setTipo] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [lista, setLista] = useState([]);
  const [descripcionDano, setDescripcionDano] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [modoTecnico, setModoTecnico] = useState(false);
  const [qrScanner, setQrScanner] = useState(null);

  // ==================== BEEP ====================
  const beep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
      navigator.vibrate?.(150);
    } catch (e) {
      console.warn("Beep error:", e);
    }
  };

  // ==================== MANEJADORES ====================
  const handleAdd = () => {
    if (codigo.trim() !== "" && !lista.includes(codigo.trim())) {
      setLista([...lista, codigo.trim()]);
      setCodigo("");
    }
  };

  const handleRemove = (idx) => setLista(lista.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!tipo || lista.length === 0) {
      alert("⚠️ Selecciona un tipo y escanea al menos una herramienta.");
      return;
    }
    if (tipo === "Devolución con daño" && descripcionDano.trim() === "") {
      alert("⚠️ Debes ingresar una descripción del daño.");
      return;
    }

    const payload = {
      tecnico,
      tipo_movimiento: tipo,
      herramientas: lista,
      descripcion_dano: tipo === "Devolución con daño" ? descripcionDano : null,
    };

    setLoading(true);
    try {
      await api.post("/registros", payload);
      alert("✅ Movimiento registrado con éxito");
      setLista([]);
      setTipo(null);
      setTecnico("");
      setDescripcionDano("");
      setTecnicoConfirmado(false);
    } catch (err) {
      console.error("❌ Error al registrar:", err);
      alert("❌ Error al registrar movimiento.");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTRO DE LECTURAS REPETIDAS ====================
  let lastScanned = { code: null, time: 0 };

  const handleScan = (text) => {
    if (!text) return;
    const code = text.trim();
    const now = Date.now();

    if (lastScanned.code === code && now - lastScanned.time < 2000) {
      console.log("⏸️ Lectura repetida ignorada:", code);
      return;
    }

    lastScanned = { code, time: now };

    if (lista.includes(code)) {
      console.log("⚠️ Código ya agregado:", code);
      navigator.vibrate?.(50);
      return;
    }

    beep();

    if (modoTecnico) {
      setTecnico(code);
      setTecnicoConfirmado(true);
      stopScanner();
    } else {
      setLista((prev) => [...prev, code]);
    }
  };

  // ==================== LECTOR QR ====================
  const startQrScanner = async () => {
    if (qrBusy) {
      console.warn("⏸️ Cámara QR en uso, espera a que se libere.");
      return;
    }

    qrBusy = true;
    try {
      // Detener cualquier lector previo antes de iniciar
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch { }
      if (qrScanner) {
        await qrScanner.stop().catch(() => { });
        await qrScanner.clear().catch(() => { });
      }

      const elementId = "qr-reader";
      const el = document.getElementById(elementId);
      if (!el) {
        console.error("❌ Contenedor QR no encontrado");
        qrBusy = false;
        return;
      }
      el.innerHTML = ""; // limpia cualquier canvas viejo

      const scanner = new Html5Qrcode(elementId);
      setQrScanner(scanner);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 45,
          qrbox: (vw, vh) => {
            const minEdge = Math.min(vw, vh);
            const boxSize = Math.floor(minEdge * 0.7);
            return { width: boxSize, height: boxSize };
          },
          rememberLastUsedCamera: true,
          disableFlip: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        (decodedText) => {
          if (decodedText) {
            console.log("✅ QR detectado:", decodedText);
            handleScan(decodedText.trim());
          }
        }
      );
    } catch (err) {
      console.error("❌ Error iniciando QR:", err.name, err.message);
      alert(`Error cámara (QR): ${err.name}`);
    } finally {
      // Dejamos un pequeño delay para asegurar que se libere
      setTimeout(() => {
        qrBusy = false;
      }, 600);
    }
  };

  // ==================== LECTOR DE BARRAS ====================
  const startBarcodeScanner = () => {
    try {
      if (Quagga.running) Quagga.stop();

      const target = document.getElementById("barcode-reader");
      if (!target) return;

      let lastCode = null;
      let repeatCount = 0;

      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target,
            constraints: { facingMode: "environment" },
          },
          decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader"],
          },
          locate: true,
          frequency: 25,
        },
        (err) => {
          if (err) {
            console.error("❌ Error inicializando Quagga:", err.name, err.message);
            alert(`No se pudo acceder a la cámara (Barras): ${err.name}`);
            return;
          }
          Quagga.start();
        }
      );

      Quagga.offDetected();
      Quagga.onDetected((data) => {
        const code = data?.codeResult?.code;
        if (!code) return;

        if (code === lastCode) repeatCount++;
        else {
          lastCode = code;
          repeatCount = 1;
        }

        if (repeatCount >= 3) {
          console.log("📦 Código confirmado:", code);
          handleScan(code);
          Quagga.stop();
        }
      });
    } catch (err) {
      console.error("❌ Error al iniciar Quagga:", err.name, err.message);
      alert(`Error de cámara (Barras): ${err.name}`);
    }
  };

  // ==================== DETENER ESCÁNER ====================
  const stopScanner = async () => {
    try {
      if (modoTecnico) {
        // 🔹 Detiene lector de barras (Quagga)
        try {
          Quagga.offDetected();
          if (Quagga.running) Quagga.stop();
        } catch (e) {
          console.warn("⚠️ Error cerrando Quagga:", e);
        }

        const el = document.getElementById("barcode-reader");
        if (el) el.innerHTML = "";
      }
      else if (qrScanner) {
        // 🔹 Detiene lector de QR (Html5Qrcode)
        try {
          console.log("🛑 Cerrando lector QR...");
          await qrScanner.stop().catch(() => { });
          await qrScanner.clear().catch(() => { });
        } catch (e) {
          console.warn("⚠️ Error deteniendo Html5Qrcode:", e);
        } finally {
          const qrEl = document.getElementById("qr-reader");
          if (qrEl) qrEl.innerHTML = "";
          setQrScanner(null);
          // 🔒 Espera corta para liberar realmente el stream
          setTimeout(() => {
            qrBusy = false;
            console.log("✅ Cámara QR liberada.");
          }, 500);
        }
      }
    } catch (e) {
      console.warn("⚠️ Error general cerrando cámara:", e);
    }

    // 🔹 Marca visualmente cámara cerrada
    setMostrarCamara(false);
  };

  // ==================== CICLO DE VIDA ====================
  useEffect(() => {
    if (mostrarCamara) {
      if (modoTecnico) startBarcodeScanner();
      else startQrScanner();
    }

    return () => {
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch { }
      if (qrScanner) qrScanner.stop().catch(() => { });
      const qrEl = document.getElementById("qr-reader");
      const brEl = document.getElementById("barcode-reader");
      if (qrEl) qrEl.innerHTML = "";
      if (brEl) brEl.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarCamara]);

  // Cierra cámara al salir de la página
  useEffect(() => {
    const cleanup = () => {
      try {
        Quagga.stop();
        if (qrScanner) qrScanner.stop().catch(() => { });
      } catch { }
    };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, [qrScanner]);

  // ==================== UI ====================
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-text">
      {/* ================== Encabezado ================== */}
      <div className="flex flex-col items-center justify-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
          <BarChart3 size={26} className="text-success" /> Panel de Registro
        </h1>
        <p className="text-gray-400 text-sm mt-1 text-center">
          Escaneá, registrá y controlá los movimientos de herramientas
        </p>
        <div className="w-24 h-[2px] bg-success mt-3 rounded-full" />
      </div>



      {/* === PASO 1: Escaneo técnico (Barras) === */}
      {!tecnicoConfirmado && (
        <div className="bg-primary p-6 shadow-lg rounded-xl border border-secondary/40">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Escanear tarjeta del técnico (Código de barras)
          </h2>

          <input
            type="text"
            placeholder="🔑 Escanea tarjeta o usa cámara"
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setTecnicoConfirmado(true)}
            className="w-full p-4 rounded-lg bg-secondary/20 border border-secondary/50 text-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-success mb-4"
          />

          {mostrarCamara ? (
            <div className="mb-4 flex flex-col items-center">
              <div
                id="barcode-reader"
                className="w-full max-w-[400px] aspect-square rounded-lg overflow-hidden border border-secondary"
              ></div>
              <button
                onClick={stopScanner}
                className="bg-gray-600 hover:bg-gray-700 w-full py-3 text-white rounded-lg mt-3 flex items-center justify-center gap-2 transition"
                title="Cerrar cámara"
              >
                <CameraOff size={20} />
                Cerrar cámara
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setModoTecnico(true);
                setMostrarCamara(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 w-full py-3 text-white rounded-lg mb-3 flex items-center justify-center gap-2 transition"
              title="Escanear con cámara"
            >
              <Camera size={20} />
              Escanear con cámara
            </button>
          )}

          <button
            onClick={() => setTecnicoConfirmado(true)}
            disabled={!tecnico.trim()}
            className={`w-full py-3 rounded-lg text-white transition flex items-center justify-center gap-2 ${tecnico.trim()
              ? "bg-success hover:bg-green-700"
              : "bg-gray-500 cursor-not-allowed"
              }`}
            title="Confirmar técnico"
          >
            <CheckCircle2 size={20} />
            Confirmar técnico
          </button>
        </div>
      )}

      {/* === PASO 2: Movimiento === */}
      {tecnicoConfirmado && !tipo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
          <ButtonLarge
            icon={<Package size={24} />}
            label="Entrega"
            type="success"
            onClick={() => setTipo("Entrega")}
          />
          <ButtonLarge
            icon={<Repeat2 size={24} />}
            label="Devolución"
            type="primary"
            onClick={() => setTipo("Devolución")}
          />
          <ButtonLarge
            icon={<AlertTriangle size={24} />}
            label="Con daño"
            type="warning"
            onClick={() => setTipo("Devolución con daño")}
          />
          <ButtonLarge
            icon={<Wrench size={24} />}
            label="Mantenimiento"
            type="secondary"
            onClick={() => setTipo("Mantenimiento / reparación")}
          />
          <ButtonLarge
            icon={<XCircle size={24} />}
            label="Baja"
            type="error"
            onClick={() => setTipo("Herramienta extraviada")}
          />
        </div>
      )}

      {/* === PASO 3: Escaneo herramientas (QR) === */}
      {tecnicoConfirmado && tipo && (
        <div className="mt-8 bg-primary p-6 rounded-xl shadow-lg border border-secondary/40">
          <h2 className="text-xl font-semibold mb-2 text-center">
            Técnico: <span className="text-success">{tecnico}</span>
          </h2>
          <h3 className="text-lg font-medium mb-4 text-center">
            Movimiento: <span className="text-warning">{tipo}</span>
          </h3>

          {mostrarCamara && !modoTecnico ? (
            <div className="mb-4 flex flex-col items-center">
              <div
                id="qr-reader"
                className="w-full max-w-[400px] aspect-square rounded-lg overflow-hidden border border-secondary"
              ></div>

              <button
                onClick={stopScanner}
                className="bg-gray-600 hover:bg-gray-700 w-full py-3 text-white rounded-lg mt-3 flex items-center justify-center gap-2 transition"
                title="Cerrar cámara"
              >
                <CameraOff size={20} />
                Cerrar cámara
              </button>

            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdd();
                }}
              >
                <input
                  type="text"
                  placeholder="📷 Escanea código de herramienta o usa cámara"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full p-4 rounded-lg bg-secondary/20 border border-secondary/50 text-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-success mb-4"
                />
              </form>

              <button
                onClick={() => {
                  setModoTecnico(false);
                  setMostrarCamara(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 w-full py-3 text-white rounded-lg mb-3 flex items-center justify-center gap-2 transition"
                title="Escanear con cámara"
              >
                <Camera size={20} />
                Escanear con cámara
              </button>
            </>
          )}

          {tipo === "Devolución con daño" && (
            <textarea
              placeholder="📝 Describir daño de la herramienta"
              value={descripcionDano}
              onChange={(e) => setDescripcionDano(e.target.value)}
              className="w-full p-4 rounded-lg bg-secondary/20 border border-secondary/50 text-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-error mb-4"
              rows={3}
            />
          )}

          <ul className="bg-secondary/20 border border-secondary/40 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
            {lista.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center py-2 border-b border-secondary/30 last:border-none text-lg">
                {item}
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-error text-sm ml-4 hover:underline flex items-center gap-1"
                  title="Eliminar elemento"
                >
                  <X size={16} />
                </button>
              </li>
            ))}

          </ul>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`${loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-success hover:bg-green-700"
              } w-full py-4 text-white text-lg rounded-lg flex items-center justify-center gap-2 transition`}
            title="Confirmar movimiento"
          >
            {loading ? (
              "Registrando..."
            ) : (
              <>
                <CheckCircle2 size={20} />
                Confirmar movimiento
              </>
            )}
          </button>

          <button
            onClick={() => {
              setTipo(null);
              setLista([]);
              setDescripcionDano("");
            }}
            className="bg-gray-600 hover:bg-gray-700 w-full py-3 text-white rounded-lg mt-3 flex items-center justify-center gap-2 transition"
            title="Volver"
          >
            <ArrowLeftCircle size={20} />
            Volver
          </button>
        </div>
      )}
    </div>
  );
}
