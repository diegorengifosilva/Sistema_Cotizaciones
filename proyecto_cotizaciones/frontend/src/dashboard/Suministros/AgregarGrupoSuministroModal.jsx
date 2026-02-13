import React, { useState, useEffect } from "react";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ModalOverlay from "../../components/ui/ModalOverlay";
import { Layers3 } from "lucide-react"; // Iconografía moderna

function AgregarGrupoSuministroModal({ open, onClose, onConfirm, grupo = null }) {
  const [form, setForm] = useState({
    tipo: "",
    nombre: "",
    cantidad: 1,
    totalGrupo: false,
    nroLineasPdf: 0,
  });

  const [tiposSuministro, setTiposSuministro] = useState([]);

  // ==========================
  // Cargar tipos desde backend
  // ==========================
  useEffect(() => {
    if (!open) return;

    const fetchTipos = async () => {
      try {
        const res = await api.get("/cotizaciones/tgasto/");
        const data = Array.isArray(res.data) ? res.data : [];
        // Concepto 0 = EQUIPOS / MATERIALES, activos = "1"
        const activos = data.filter((t) => t.concepto === "0" && t.activo === "1");
        setTiposSuministro(activos);
      } catch (error) {
        console.error("Error cargando tipos de suministro", error);
        setTiposSuministro([]);
      }
    };

    fetchTipos();
  }, [open]);

  // ==========================
  // Reset o carga de grupo al abrir
  // ==========================
  useEffect(() => {
    if (!open) return;

    if (grupo) {
      const cogReal = grupo.cog;
      const tipoCodigo = String(cogReal).slice(-2); // 🔥 01 / 02 según tu tabla

      setForm({
        tipo: tipoCodigo,
        nombre: grupo.titulo || "",
        cantidad: grupo.cantidad || 1,
        totalGrupo: !!grupo.totalGrupo,
        nroLineasPdf: grupo.nroLineasPdf || 0,
      });
    } else {
      // ➕ Modo creación
      setForm({
        tipo: "",
        nombre: "",
        cantidad: 1,
        totalGrupo: false,
        nroLineasPdf: 0,
      });
    }
  }, [open, grupo]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    if (!form.tipo) return;

    onConfirm({
      ...form,
      _key: grupo?.cog, // 🔹 clave usada para identificar edición
    });

    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Layers3 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {grupo ? "Editar Grupo de Suministros" : "Nuevo Grupo de Suministros"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Configuración de agrupación y cantidades
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO */}
        <div className="p-2 space-y-5">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            
            {/* TIPO */}
            <SelectField
              inline
              size="sm"
              label="Tipo de suministro:"
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              disabled={!!grupo}
              options={[
                { id: "", nombre: "-- Seleccionar --" },
                ...tiposSuministro.map((t) => ({
                  id: t.codigo,
                  nombre: t.nombre,
                })),
              ]}
              className="text-xs font-semibold focus:ring-teal-500/20"
            />

            {/* NOMBRE */}
            <InputField
              inline
              size="sm"
              label="Nombre del grupo:"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej. Equipos de red"
              className="text-xs font-semibold focus:ring-teal-500/20"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* CANTIDAD */}
              <InputField
                inline
                size="sm"
                type="number"
                min={1}
                label="Cantidad:"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                className="text-xs font-bold focus:ring-teal-500/20"
              />

              {/* LÍNEAS PDF */}
              <InputField
                inline
                size="sm"
                type="number"
                min={0}
                label="Líneas PDF:"
                name="nroLineasPdf"
                value={form.nroLineasPdf}
                onChange={handleChange}
                className="text-xs font-bold focus:ring-teal-500/20"
              />
            </div>

            {/* TOTAL POR GRUPO (CHECKBOX ESTILIZADO) */}
            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm group hover:border-teal-600 transition-colors">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                  Total por grupo
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Mostrar sumatoria en reportes</span>
              </div>

              <input
                type="checkbox"
                name="totalGrupo"
                checked={form.totalGrupo}
                onChange={handleChange}
                className="h-5 w-5 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 accent-[#0d767e] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Cancelar
          </Button>
          <Button
            variant="ghost"
            onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            Aceptar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AgregarGrupoSuministroModal;
