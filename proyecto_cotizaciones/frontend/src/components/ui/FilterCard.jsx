import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Network,
  Info,
  Repeat2,
  Binoculars,
  Search,
  AlertTriangle,
  Filter,
  Loader2,
  ChevronDown,
  Building2,
  Send,
  FileSliders,
  FunnelX,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

/* ==========================================================
   📌 FilterCard — Filtros corporativos PMInsight (COTIZACIONES)
   ========================================================== */
const FilterCard = ({ onProcess, onReport, initialFilters = {} }) => {
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({

    anio: initialFilters.anno || currentYear.toString(),
    mes: initialFilters.mes || "%",
    cliente: initialFilters.cliente || "%",
    estado: initialFilters.estado || "%",
    area: initialFilters.area || "%",
    envio: initialFilters.envio || "%",
    generalCampo: "",
    generalValor: "",
  });

  const [clientes, setClientes] = useState([]);
  const [areas, setAreas] = useState([]);
  const estados = [
    { value: "%", label: "-- Todos --" },
    { value: "1", label: "Adjudicado" },
    { value: "2", label: "Pendiente" },
    { value: "3", label: "Perdida" },
    { value: "4", label: "Anulado" },
    { value: "5", label: "Postergada" },
    { value: "7", label: "En Seguimiento" },
    { value: "2_7", label: "Pendiente y Seguimiento" },
  ];
  const envios = [
    { value: "%", label: "-- Todos --" },
    { value: "0", label: "Pendiente de Envio" },
    { value: "1", label: "Pendiente de Revision" },
    { value: "2", label: "Pendiente de Aprobacion" },
    { value: "3", label: "Enviado" },
  ];

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const DEFAULT_FILTERS = {
    anio: currentYear.toString(),
    mes: "%",
    cliente: "%",
    estado: "%",
    area: "%",
    envio: "%",
    generalCampo: "",
    generalValor: "",
  };

  const handleClearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    // Si quieres que se aplique inmediatamente
    if (onProcess) {
      await onProcess(DEFAULT_FILTERS);
    }
  };

  /* ==========================================================
     🚀 Carga inicial de combos (Clientes / Áreas / Estados / Envios)
     ========================================================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [clientesRes, areasRes] = await Promise.all([
          api.get("cotizaciones/clientes/"),
          api.get("cotizaciones/areas/"),
          api.get("cotizaciones/estados/"),
        ]);

        setClientes(clientesRes.data || []);
        setAreas(areasRes.data || []);

      } catch (err) {
        console.error("❌ Error cargando filtros:", err);
        setError("No se pudieron cargar las opciones de filtro.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const anios = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);

  const meses = [
    { value: "%", label: "-- Todos --" },
    { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
    { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
  ];

  /* ==========================================================
     🎯 Campos del Filtro General — DashboardCotizacion
     ========================================================== */
  const camposGenerales = [
    { value: "", label: "-- Todos --" },
    { value: "num_reg", label: "N° Registro" },
    { value: "cotin", label: "Código" },
    { value: "cotif", label: "Fecha Emisión" },
    { value: "cliente_nombre", label: "Nombre Cliente" },
    { value: "refef", label: "Referencia" },
    { value: "nombr", label: "Representante" },
    { value: "nombc", label: "Resp. Comercial" },
    { value: "nombt", label: "Resp. Técnico" },
    { value: "tot_c", label: "Cotizado" },
    { value: "tot_d", label: "Total" },
    { value: "prob", label: "Probabilidad" },
    { value: "regus", label: "Hecho por" },
  ];

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  /* ==========================================================
     🔥 Aplicar filtros (igual que Caja Chica)
     ========================================================== */
  const handleProcess = async (e) => {
    if (e) e.preventDefault();
    if (!onProcess) return;

    setProcessing(true);

    try {
      const filtros = { ...filters };

      // Convertir filtro general en campo real
      if (filtros.generalCampo && filtros.generalValor) {
        filtros.campo = filtros.generalCampo;
        filtros.valor = filtros.generalValor.trim();
      }

      delete filtros.generalCampo;
      delete filtros.generalValor;

      await onProcess(filtros);
    } catch (err) {
      console.error("❌ Error al aplicar filtros:", err);
      setError("Error al aplicar filtros.");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length) {
      setFilters(prev => ({
        ...prev,
        ...initialFilters,
      }));
    }
  }, [initialFilters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-full"
    >
      {/* HEADER */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="w-full flex items-center justify-between px-1 py-2 md:py-0 cursor-pointer md:cursor-default"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
          <Filter className="w-4 h-4 text-blue-600" /> Filtros
        </h2>

        <div className="md:hidden">
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${isMobileOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {(isMobileOpen || window.innerWidth >= 768) && (
          <motion.div
            key="filters-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="pt-3 pb-4 flex flex-col gap-5"
          >
            {/* ERROR MESSAGE */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-2 text-xs">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            {/* Botón Limpiar flotante */}
            <button
              onClick={handleClearFilters}
              className="absolute top-2 right-2 px-2 py-1 text-xs rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 shadow-sm flex items-center gap-1"
            >
              <FunnelX className="w-4 h-4" />
            </button>

            {/* SELECTORES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Año + Mes */}
              <div className="grid grid-cols-2 gap-2">
                {/* Año */}
                <SelectBox
                  label="Año"
                  icon={<Calendar className="w-4 h-4" />}
                  options={anios.reverse().map((a) => ({ value: a, label: a }))}
                  value={filters.anio}
                  onChange={(e) => handleChange("anio", e.target.value)}
                />

                {/* Mes */}
                <SelectBox
                  label="Mes"
                  icon={<CalendarDays className="w-4 h-4" />}
                  options={meses}
                  value={filters.mes}
                  onChange={(e) => handleChange("mes", e.target.value)}
                />
              </div>

              {/* Cliente */}
              <SelectBox
                label="Cliente"
                icon={<Building2 className="w-4 h-4" />}
                options={[
                  { value: "%", label: "-- Todos --" },
                  ...clientes.map((c) => ({
                    value: c.codigo,
                    label: c.nombre,
                  })),
                ]}
                value={filters.cliente}
                onChange={(e) => handleChange("cliente", e.target.value)}
              />

              {/* Área */}
              <SelectBox
                label="Área"
                icon={<Network className="w-4 h-4" />}
                options={[
                  { value: "%", label: "-- Todos --" },
                  ...areas.map((a) => ({
                    value: a.codigo,
                    label: a.nombre,
                  })),
                ]}
                value={filters.area}
                onChange={(e) => handleChange("area", e.target.value)}
              />

              {/* Estado */}
              <SelectBox
                label="Estado"
                icon={<Info className="w-4 h-4" />}
                options={estados}
                value={filters.estado}
                onChange={(e) => handleChange("estado", e.target.value)}
              />

              {/* Estado Envío */}
              <SelectBox
                label="Estado Envío"
                icon={<Send className="w-4 h-4" />}
                options={envios}
                value={filters.envio}
                onChange={(e) => handleChange("envio", e.target.value)}
              />

              {/* General + Buscador */}
              <div className="grid grid-cols-2 gap-2">
                <SelectBox
                  label="General"
                  icon={<Binoculars className="w-4 h-4" />}
                  options={camposGenerales}
                  value={filters.generalCampo}
                  onChange={(e) => handleChange("generalCampo", e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                    <Search className="w-4 h-4" /> Buscador
                  </label>
                  <input
                    type="text"
                    placeholder="Ingrese valor..."
                    value={filters.generalValor}
                    onChange={(e) => handleChange("generalValor", e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                size="lg"
                variant="ghost"
                className="text-sm font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 border border-transparent hover:border-blue-200 rounded-xl h-9 px-8 transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Repeat2 className="w-4 h-4" /> Procesar
                  </>
                )}
              </Button>

              <Button
                onClick={() => onReport?.(filters)}
                size="lg"
                variant="ghost"
                className="text-sm font-black uppercase tracking-widest text-green-700 hover:bg-green-100 border border-transparent hover:border-green-200 rounded-xl h-9 px-8 transition-all"
              >
                <FileSliders className="w-4 h-4" /> Reporte
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ==========================================================
   🧩 SelectBox — Componente corporativo PMInsight
   ========================================================== */
const SelectBox = ({ label, icon, options, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
      {icon} {label}
    </label>

    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 transition-all"
    >
      {options.map((opt) => (
        <option key={`${label}-${opt.value}-${opt.label}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default FilterCard;
