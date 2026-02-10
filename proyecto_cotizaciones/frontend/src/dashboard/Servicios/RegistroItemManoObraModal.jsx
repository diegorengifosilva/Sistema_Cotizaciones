import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Users, Briefcase, Calculator, TrendingUp, ChevronsRight } from "lucide-react";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import TipoPersonalModal from "./TipoPersonalModal";

function RegistroItemManoObraModal({ open, onClose, onConfirm, item, areaCotizacion }) {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    area: "",
    personal: "",
    personalCodigo: "",
    descripcion: "",
    hombres: 1,
    dias: 1,
    horas: 8,
    costoDia: 0,
    utilidad: 0,
    porcentaje: 20,
    costoTotal: 0,
    cotizadoDia: 0,
    cotizadoTotal: 0,
    utilidadTotal: 0,
  });
  const [tipoPersonalModalOpen, setTipoPersonalModalOpen] = useState(false);
  const toNumber = v => Number(v) || 0;

  // ==========================
  // CARGAR AREAS
  // ==========================
  useEffect(() => {
    if (!open) return;

    api.get("cotizaciones/areas/")
      .then(res => setAreas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAreas([]));
  }, [open]);

  // ==========================
  // Diccionario nombre -> codigo
  // ==========================
  const areaDict = areas.reduce((acc, a) => {
    acc[a.nombre] = a.codigo;
    return acc;
  }, {});

  // ==========================
  // CARGAR DATOS EXISTENTES
  // ==========================
  useEffect(() => {
    if (!open) return;

    if (item) {
      // ✏️ MODO EDICIÓN: cargamos los datos del item existente
      setForm({
        id: item.id ?? item.num,   // opcional, solo referencia visual
        num: item.num,             // 🔴 ESTA ES LA CLAVE REAL
        area: item.tpr || "",
        personal: item.personalCodigo
          ? `${item.personalCodigo} - ${item.personal}`
          : item.cod ?? "",
        personalCodigo: item.personalCodigo || item.cod?.split(" - ")[0] || "",
        descripcion: item.des || "",
        hombres: item.can ?? 1,
        dias: item.tde ?? 1,
        horas: item.pro ?? 8,
        costoDia: item.puc ?? 0,
        utilidad: item.tou ?? 0,
        porcentaje: item.cau ?? 20,
        costoTotal: item.toc ?? 0,
        cotizadoDia: item.val ?? 0,
        cotizadoTotal: item.tot ?? 0,
        utilidadTotal: toNumber(item.tou) * toNumber(item.can)* toNumber(item.tde),
      });
    } else {
      // ➕ MODO NUEVO: reset
      setForm(prev => ({
        ...prev,
        descripcion: "",
        hombres: 1,
        dias: 1,
        horas: 8,
        costoDia: 0,
        utilidad: 0,
        porcentaje: 20,
        costoTotal: 0,
        cotizadoDia: 0,
        cotizadoTotal: 0,
        utilidadTotal: 0,
        personal: "",
        personalCodigo: "",
        area: areaCotizacion,
      }));
    }
  }, [open, item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ==========================
  // CÁLCULOS AUTOMÁTICOS
  // ==========================
  useEffect(() => {
    setForm(prev => {
      const dias = Number(prev.dias) || 0;
      const costoDia = Number(prev.costoDia) || 0;
      const utilidad = Number(prev.utilidad) || 0;
      const hombres = Number(prev.hombres) || 0;

      const porcentaje =
        utilidad > 0 && costoDia > 0
          ? ((utilidad / costoDia) * 100).toFixed(2)
          : prev.porcentaje ?? 20.00;

      const costoTotal = (costoDia * dias * hombres).toFixed(2);
      const cotizadoDia = (costoDia + utilidad).toFixed(2);
      const cotizadoTotal = (cotizadoDia * dias * hombres).toFixed(2);
      const utilidadTotal = (utilidad * dias * hombres).toFixed(2);

      return {
        ...prev,
        porcentaje,
        costoTotal,
        cotizadoDia,
        cotizadoTotal,
        utilidadTotal,
      };
    });
  }, [form.dias, form.costoDia, form.utilidad, form.hombres]);

  const handleSubmit = () => {
    if (!form.area || !form.descripcion.trim()) return;
    onConfirm(form);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Registro Item - Mano de Obra
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Cálculo de HH, personal y costos operativos
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <div className="p-2 space-y-2">
          
          {/* SECCIÓN 1: ASIGNACIÓN Y TAREA */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-teal-600" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Asignación de Tarea</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                inline size="sm" label="Área ejecuta:" name="area"
                value={form.area}
                onChange={(e) => setForm(prev => ({ ...prev, area: e.target.value }))}
                options={areas.map(a => ({ id: a.codigo, nombre: a.nombre }))}
                className="text-xs font-semibold focus:ring-teal-500/20"
              />

              <InputField
                inline size="sm" label="Tipo Personal:" name="personal"
                value={form.personal} onChange={handleChange}
                className="text-xs font-semibold focus:ring-teal-500/20"
                trailingIcon={
                  <button
                    type="button"
                    className="ml-1 text-[#0d767e] hover:scale-110 transition-transform"
                    onClick={() => setTipoPersonalModalOpen(true)}
                  >
                    <ChevronsRight size={16} />
                  </button>
                }
              />
            </div>

            <div className="flex items-start gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px] pt-1">
                Descripción:
              </label>
              <textarea
                name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2 py-1.5 resize-none min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-white"
                placeholder="Ingrese descripción de la tarea..."
              />
            </div>
          </div>

          {/* SECCIÓN 2: CÁLCULO DE TIEMPOS Y COSTOS */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* INPUTS DE CÁLCULO */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-teal-600" />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Variables y Costo</span>
              </div>
              <div className="space-y-3">
                <InputField inline size="sm" type="number" label="Cantidad Hombres:" name="hombres" value={form.hombres} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-2">
                  <InputField inline size="sm" type="number" label="Días:" name="dias" value={form.dias} onChange={handleChange} />
                  <InputField inline size="sm" type="number" label="Horas:" name="horas" value={form.horas} onChange={handleChange} />
                </div>
                <InputField inline size="sm" label="Costo Hombre/Día:" name="costoDia" value={form.costoDia} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-2">
                  <InputField inline size="sm" label="Utilidad:" name="utilidad" value={form.utilidad} onChange={handleChange} />
                  <InputField inline size="sm" label="Porcentaje:" name="porcentaje" value={form.porcentaje} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* RESUMEN DE MANO DE OBRA */}
            <div className="bg-[#0d767e]/5 border border-[#0d767e]/10 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#0d767e]" />
                <span className="text-[11px] font-black text-[#0d767e] uppercase tracking-tight">Resumen MO</span>
              </div>
              <div className="space-y-1">
                <InputField inline size="sm" label="Costo Total:" value={form.costoTotal} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Cotizado Día:" value={form.cotizadoDia} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Utilidad Total:" value={form.utilidadTotal} readOnly className="bg-transparent border-none font-bold text-teal-700 text-[11px]" />
                <div className="pt-2 mt-2 border-t border-[#0d767e]/10">
                   <InputField inline size="sm" label="Cotizado Total:" value={form.cotizadoTotal} readOnly className="bg-transparent border-none font-black text-[#0d767e] text-sm" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost" onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Salir
          </Button>
          <Button
            variant="ghost" onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            Aceptar
          </Button>
        </div>

        {/* MODAL TIPO PERSONAL (Lógica intacta) */}
        <TipoPersonalModal
          open={tipoPersonalModalOpen}
          onClose={() => setTipoPersonalModalOpen(false)}
          areaSeleccionada={form.area}
          onSelect={(registro, costoSeleccionado) => 
              setForm(prev => ({
              ...prev,
              personal: `${registro.codigo} - ${registro.nombre}`,
              personalCodigo: registro.codigo,
              costoDia: parseFloat(costoSeleccionado).toFixed(2),
            }))}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RegistroItemManoObraModal;
