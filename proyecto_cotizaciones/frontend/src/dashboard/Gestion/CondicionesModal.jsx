// src/dashboard/cotizaciones/CondicionesModal.jsx

import { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { ShieldCheck, Info, Save, X } from "lucide-react";

export default function CondicionesModal({
  open,
  onClose,
  condicionesIniciales,
  num_reg,
  onAceptar,
}) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTexto(condicionesIniciales ?? "");
  }, [open, condicionesIniciales]);

  const handleGuardar = async () => {
    try {
      setSaving(true);
      if (onAceptar) await onAceptar(texto);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Condiciones Generales
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Términos legales y cláusulas comerciales de la propuesta
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO DEL EDITOR */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm quill-modern-container">

              <ReactQuill
                value={texto}
                onChange={setTexto}
                theme="snow"

                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* FOOTER GESTIÓN */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] px-6 py-3 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 z-20">
          <div className="flex items-center gap-2 opacity-70">
            <Info size={14} className="text-slate-400" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Los cambios se reflejarán en la impresión del PDF
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-100 border border-transparent hover:border-red-200 rounded-xl h-9 px-8 transition-all"
            >
              Salir
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleGuardar}
              disabled={saving}
              className="text-[11px] font-black uppercase tracking-widest text-sky-700 hover:bg-sky-100 border border-transparent hover:border-sky-200 rounded-xl h-9 px-8 transition-all"            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
