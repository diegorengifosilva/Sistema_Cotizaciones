// frontend/src/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { 
  BriefcaseBusiness,
  Eye, 
  FileText, 
  CircleDollarSign, 
  Banknote, 
  FilePlus, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import KpiCard from "@/components/ui/KpiCard";
import FilterCard from "@/components/ui/FilterCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { getEnvioColor, getEnvioNombre, ENVIO_STATE_COLORS } from "@/components/ui/colors";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import DashboardBoard from "../board/DashboardBoard";

export default function CotizacionesHome() {
  const { authUser: user, logout } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [clientes, setClientes] = useState([]);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const navigate = useNavigate();
  const [openNueva, setOpenNueva] = useState(false);
  const [annoActual, setAnnoActual] = useState(new Date().getFullYear()); // año actual por defecto
  const [processingFilters, setProcessingFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({
    anno: new Date().getFullYear(), // año actual
    mes: "%",                        // todos los meses por defecto
    cliente: "%",                    // todos los clientes
    estado: "%",                     // todos los estados
    area: "%",                        // todas las áreas
    envio: "%",                       // todos los envíos
    num_reg: "",                      // opcional: número de registro específico
    campo: "",                        // campo específico para búsqueda flexible
    valor: "",                        // valor para el campo específico
    generalCampo: "",                 // búsqueda general tipo CAJA CHICA
    generalValor: "",                 // valor de búsqueda general
    index: 1,                         // página actual si implementas paginación
    num_regs: 10,                     // cantidad de registros por página
  });
  const [clientesMap, setClientesMap] = useState({});

  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 50], [0, 0.25]);
  const blurValue = useTransform(scrollY, [0, 100], [4, 8]);

  // Fetch cotizaciones con filtro por año actual
  const fetchCotizaciones = useCallback(async (params = { anno: annoActual }) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await api.get("cotizaciones/aprobacion_cotizacion", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const tabla = Array.isArray(data?.tabla) ? data.tabla : [];
      const dashboard = data?.dashboard || {};

      const dataLimpia = tabla.map((item) => ({
        ...item,
        cliente: item.cliente?.trim() || "-",
        area: item.area?.trim() || "-",
        estado: item.estado?.trim() || "-",
      }));

      dataLimpia.sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
        const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
        if (fechaB - fechaA !== 0) return fechaB - fechaA;
        return (b.numero || "").localeCompare(a.numero || "");
      });

      setCotizaciones(dataLimpia);
      setStats(dashboard);
    } catch (e) {
      console.error("Error cargando cotizaciones:", e);
      if (e?.response?.status === 401) logout();
      toast.error("Error cargando las cotizaciones.");
    } finally {
      setLoading(false);
    }
  }, [annoActual, logout]);

  // Obtener año actual desde la API cont_cias
  const fetchAnnoActual = async () => {
    try {
      const res = await api.get("cont_cias/001/"); // endpoint que devuelve cont_cias.cod=001
      if (res.data?.anno) setAnnoActual(res.data.anno);
      fetchCotizaciones(res.data?.anno);
    } catch (err) {
      console.warn("No se pudo obtener año actual, se usa el año del sistema", err);
      fetchCotizaciones(annoActual);
    }
  };

  // ==========================
  // CARGAR AREAS
  // ==========================
  useEffect(() => {
    if (!open) return;

    api.get("cotizaciones/areas/")
      .then(res => setAreas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAreas([]));
  }, [open]);

  // ===========
  // CLIENTES
  // ===========
  useEffect(() => {
      const fetchClientes = async () => {
          const res = await api.get("/cotizaciones/clientes/");
          setClientes(res.data);
      };
      fetchClientes();
  }, []);

  // Mapeo  de Clientes
  useEffect(() => {
    const fetchClientes = async () => {
      const res = await api.get("/cotizaciones/clientes/");
      const map = {};
      res.data.forEach(c => {
        map[c.codigo] = c.nombre;
      });
      setClientesMap(map);
    };

    fetchClientes();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAnnoActual();
  }, [user]);

  // Efecto scroll flotante
  useEffect(() => {
    const onScroll = () => {
      shadowOpacity.set(Math.min(window.scrollY / 150, 0.2));
      blurValue.set(Math.min(window.scrollY / 100, 8));
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [shadowOpacity, blurValue]);

  const cotizacionesFiltradas = cotizaciones
    .filter((c) => {
      const pasaEstado = filtro === "Todos" || c.estado_nombre === filtro;
      const pasaFecha =
        (!fechaInicio || new Date(c.cotif) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(c.cotif) <= new Date(fechaFin));
      return pasaEstado && pasaFecha;
    })
    .sort((a, b) => new Date(b.cotif) - new Date(a.cotif));

    // Aplicamos el filtro de año y mes
    const cotizacionesFiltradasPorFecha = cotizaciones.filter(c => {
    const fecha = new Date(c.fecha || c.cotif);
    const pasaAnno = !currentFilters.anno || fecha.getFullYear() === Number(currentFilters.anno);
    const pasaMes = currentFilters.mes === "%" || (fecha.getMonth() + 1 === Number(currentFilters.mes));
    return pasaAnno && pasaMes;
    });

    const totalFiltrado = cotizacionesFiltradasPorFecha.length;

    // Agrupamos por cliente solo con las cotizaciones filtradas
    const clientesAgregados = Object.values(
    cotizacionesFiltradasPorFecha.reduce((acc, c) => {
        const key = c.cliente_codigo || "-";
        if (!acc[key]) {
        acc[key] = {
            cliente_codigo: key,
            cantidad: 0,
            totalSoles: 0,
            totalDolares: 0,
            porcentaje: 0, // inicializamos
        };
        }

        acc[key].cantidad += 1;

        if (c.tmone === "S" || !c.tmone) acc[key].totalSoles += Number(c.tot_c || 0);
        if (c.tmone === "D") acc[key].totalDolares += Number(c.tot_c || 0);

        return acc;
    }, {})
    ).map(c => ({
    ...c,
    porcentaje: totalFiltrado ? ((c.cantidad / totalFiltrado) * 100).toFixed(2) : 0
    }));

    const cotizacionesPorArea = Object.values(
    cotizacionesFiltradasPorFecha.reduce((acc, c) => {
        const key = c.area_nombre || "-";
        if (!acc[key]) acc[key] = { area: key, cantidad: 0 };
        acc[key].cantidad += 1;
        return acc;
    }, {})
    );

    const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042",
    "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb",
    ];

    const TIPOS_COLORS = {
    P: "#8884d8", // Proyectos
    V: "#82ca9d", // Ventas
    S: "#ffc658", // Servicios
    };

    const tiposData = ["P", "V", "S"].map((t) => {
    const count = cotizacionesFiltradasPorFecha.filter(c => c.cotit === t).length;
    return {
        tipo: t,
        cantidad: count,
    };
    });

  if (loading) return <div className="p-6 space-y-6">Cargando cotizaciones...</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col bg-gray-50 font-sans"
    >
      <div className="flex-1 flex flex-col py-[clamp(8px,2vw,24px)] px-[clamp(8px,2vw,24px)]">

        {/* HEADER */}
        <motion.div
          style={{
            boxShadow: shadowOpacity.get() > 0 ? `0 2px 8px rgba(0,0,0,${shadowOpacity.get()})` : "none",
            backdropFilter: `blur(${blurValue.get()}px)`,
          }}
          className="sticky top-0 z-30 bg-white/90 border-b border-gray-200 rounded-2xl shadow-md px-[clamp(12px,2vw,20px)] py-[clamp(8px,1.2vw,12px)] mb-[clamp(10px,2vw,16px)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[clamp(8px,1.5vw,12px)]"
        >
          <div className="flex-1 min-w-0">
            <motion.h1
              className="font-bold flex items-center gap-3 truncate"
              style={{ fontSize: "clamp(1rem,2.2vw,2rem)" }}
            >
              <BriefcaseBusiness className="w-[clamp(20px,3vw,30px)] h-[clamp(20px,3vw,30px)] text-gray-900" />
              Cotizaciones Home
            </motion.h1>
            <motion.p
              className="mt-1 text-gray-600 italic truncate"
              style={{ fontSize: "clamp(0.7rem,0.9vw,1rem)" }}
            >
              Visión estadística de las <span className="font-semibold text-blue-600">cotizaciones </span>.
            </motion.p>
          </div>

        {/* FILTRO AÑO Y MES */}
        <div className="flex flex-wrap gap-2 justify-end items-center">
        {/* Select Año */}
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Año</label>
            <select
            value={currentFilters.anno || annoActual}
            onChange={async (e) => {
                const nuevoAnno = e.target.value;
                const params = { ...currentFilters, anno: nuevoAnno };
                setCurrentFilters(params);
                setProcessingFilters(true);
                try {
                await fetchCotizaciones(params);
                } finally {
                setProcessingFilters(false);
                }
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
            {Array.from({ length: 5 }, (_, i) => annoActual - i).map((a) => (
                <option key={a} value={a}>{a}</option>
            ))}
            </select>
        </div>

        {/* Select Mes */}
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Mes</label>
            <select
            value={currentFilters.mes || "%"}
            onChange={async (e) => {
                const nuevoMes = e.target.value;
                const params = { ...currentFilters, mes: nuevoMes };
                setCurrentFilters(params);
                setProcessingFilters(true);
                try {
                await fetchCotizaciones(params);
                } finally {
                setProcessingFilters(false);
                }
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
            <option value="%">Todos</option>
            {[
                "Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
            ].map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
            ))}
            </select>
        </div>
        </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6 w-full">
          {[
            {
              label: "Total Cotizaciones",
              value: stats.total || cotizaciones.length,
              bg: "bg-blue-100",
              text: "text-blue-800",
              border: "border-blue-300",
            },
            {
              label: "Monto Total S/.",
              value: stats.montoTotalSoles || 0,
              bg: "bg-green-100",
              text: "text-green-800",
              border: "border-green-300",
            },
            {
              label: "Monto Total $",
              value: stats.montoTotalDolares || 0,
              bg: "bg-violet-100",
              text: "text-violet-800",
              border: "border-violet-300",
            },
            {
              label: "Promedio S/.",
              value: stats.promedioSoles || 0,
              bg: "bg-red-100",
              text: "text-red-800",
              border: "border-red-300",
            },
            {
              label: "Promedio $",
              value: stats.promedioDolares || 0,
              bg: "bg-yellow-100",
              text: "text-yellow-800",
              border: "border-yellow-300",
            },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`
                flex flex-col items-center justify-center p-2
                rounded-2xl shadow-sm border
                ${kpi.bg} ${kpi.border}
              `}
            >
              <p className={`text-base font-medium tracking-wide ${kpi.text}`}>
                {kpi.label}
              </p>

              <p className={`text-2xl font-extrabold mt-1 ${kpi.text}`}>
                {kpi.value.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>

        {/* PIZARRA DINÁMICA */}
        <DashboardBoard module="cotizaciones" />


        {/* GRAFICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Fila 1, Columna 1 */}
        <div className="bg-white rounded-2xl shadow p-4">
        <p className="font-semibold mb-2">Cotizaciones por áreas</p>
        <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cotizacionesPorArea} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </div>
        </div>

        {/* Fila 1, Columna 2 */}
        <div className="bg-white rounded-2xl shadow p-4">
        <p className="font-semibold mb-2">Distribución por Clientes</p>
        <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={clientesAgregados}
                dataKey="cantidad"
                nameKey="cliente_codigo"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                label={(entry) => entry.cliente_codigo}
                >
                {clientesAgregados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} cotizaciones`, "Cantidad"]} />
            </PieChart>
            </ResponsiveContainer>
        </div>
        </div>

        {/* Fila 2, Columna 1 */}
        <div className="bg-white rounded-2xl shadow p-4">
        <p className="font-semibold mb-2">Distribución por Tipo</p>
        <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={tiposData}
                dataKey="cantidad"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                label={(entry) => entry.tipo}
                >
                {tiposData.map((entry) => (
                    <Cell key={entry.tipo} fill={TIPOS_COLORS[entry.tipo]} />
                ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} cotizaciones`, "Cantidad"]} />
            </PieChart>
            </ResponsiveContainer>
        </div>
        </div>

        {/* Fila 2, Columna 2 */}
        <div className="bg-white rounded-2xl shadow p-4">
            <p className="font-semibold mb-2">Comparativo mensual de cotizaciones.</p>
            <div className="h-52 flex items-center justify-center text-gray-400">
            Gráfico aquí
            </div>
        </div>
        </div>

        {/* TABLA CLIENTES */}
        <Table
        headers={["Cliente", "Cantidad de Cotizaciones", "Importe S/.", "Importe $", "Porcentaje"]}
        data={clientesAgregados}
        renderRow={(c) => [
            <span className="text-left font-medium">
              {clientesMap[c.cliente_codigo] ?? "Empresa no registrada"}
            </span>,
            <span className="text-center">{c.cantidad}</span>,
            <span className="text-right">
            {(c.totalSoles || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>,
            <span className="text-right">
            {(c.totalDolares || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>,
            <span className="text-right">{c.porcentaje}%</span>,
        ]}
        />

        {/* CARDS MOBILE */}
        <div className="flex flex-col gap-3 md:hidden">
          {cotizacionesFiltradas.map(c => (
            <motion.div
              key={c.numero}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
              onClick={() => { setCotizacionSeleccionada(c); setDetalleOpen(true); }}
            >
              <div className="font-semibold text-[clamp(0.9rem,2vw,1.1rem)]">{c.numero}</div>
              <div className="mt-2 flex flex-col gap-1 text-gray-600 text-[clamp(0.65rem,1.5vw,0.85rem)]">
                <div className="flex justify-between"><span>Fecha:</span><span>{c.fecha}</span></div>
                <div className="flex justify-between"><span>Referencia:</span><span>{c.referencia}</span></div>
                <div className="flex justify-between"><span>Cliente:</span><span>{c.cliente_nombre}</span></div>
                <div className="flex justify-between"><span>Área:</span><span>{c.area_nombre}</span></div>
                <div className="flex justify-between"><span>Estado:</span><span>{c.estado_nombre}</span></div>
                <div className="flex justify-between"><span>Importe:</span><span>{c.tot_c}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
