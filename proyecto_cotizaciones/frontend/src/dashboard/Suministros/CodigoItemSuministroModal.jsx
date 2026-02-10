import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/InputField";
import api from "@/services/api";
import { Search, Hash } from "lucide-react";

// tablas
import TablaRittal from "./tables/TablaRittal";
import TablaPhoenix from "./tables/TablaPhoenix";
import TablaOtros from "./tables/TablaOtros";   // OTROS
import TablaAlmLista from "./tables/TablaAlmLista";   // SCHNEIDER / LS

export default function CodigoItemSuministroModal({
  open,
  onClose,
  onSelect,
  endpoint,
  tcamb,
  proveedor,
}) {
  const [buscar, setBuscar] = useState("");
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cantidad, setCantidad] = useState(1);

  // ==========================
  // FETCH
  // ==========================
  const fetchItems = async (texto = "") => {
    if (!endpoint) return;

    setLoading(true);
    try {
      const search = texto
        ? texto.trim().toUpperCase()
        : "";

      const res = await api.get(endpoint, {
        params: search ? { search } : { limit: 20 },
      });

      setRegistros(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando items", error);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // AL ABRIR MODAL
  // ==========================
  useEffect(() => {
    if (!open) return;
    setBuscar("");
    fetchItems();
  }, [open, endpoint]);

  // ==========================
  // BUSCAR
  // ==========================
  useEffect(() => {
    if (!buscar.trim()) return;
    fetchItems(buscar);
  }, [buscar]);

  if (!open) return null;

  // ==========================
  // TABLA SEGÚN PROVEEDOR
  // ==========================
  const renderTabla = () => {
    switch (proveedor) {

      // ==========================
      // RITTAL
      // ==========================
      case "03":
        return (
          <TablaRittal
            registros={registros}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={proveedor}
            onSelect={(item) => {
              console.log("📦 ITEM FINAL SELECCIONADO:", item);
              onSelect(item);
              onClose();
            }}
          />
        );

      // ==========================
      // PHOENIX CONTACT
      // ==========================
      case "05":
        return (
          <TablaPhoenix
            registros={registros}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={proveedor}
            onSelect={(item) => {
              console.log("📦 ITEM FINAL SELECCIONADO:", item);
              onSelect(item);
              onClose();
            }}
          />
        );

      // ==========================
      // SCHNEIDER / LS
      // ==========================
      case "06": // Schneider
        return (
          <TablaAlmLista
            registros={registros}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={proveedor}
            onSelect={(item) => {
              console.log("📦 ITEM FINAL SELECCIONADO:", item);
              onSelect(item);
              onClose();
            }}
          />
        );

      case "07": // LS Industrial Systems
        return (
          <TablaAlmLista
            registros={registros}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={proveedor}
            onSelect={(item) => {
              console.log("📦 ITEM FINAL SELECCIONADO:", item);
              onSelect(item);
              onClose();
            }}
          />
        );

      // ==========================
      // OTROS
      // ==========================
      case "99":
        return (
          <TablaOtros
            registros={registros}
            loading={loading}
            tcamb={tcamb}
            cantidad={cantidad}
            proveedor={proveedor}
            onSelect={(item) => {
              console.log("📦 ITEM FINAL SELECCIONADO:", item);
              onSelect(item);
              onClose();
            }}
          />
        );

      default:
        return (
          <div className="text-center text-sm text-neutral-500 py-6">
            Proveedor no soportado aún
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER MODERNO */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <Hash size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Búsqueda de códigos
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Selección de identificadores del sistema
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL (p-2 para consistencia total) */}
        <div className="p-2 space-y-2">
          
          {/* PANEL BUSCADOR ENCAPSULADO */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <div className="flex gap-4 items-end">
              
              <div className="flex-1">
                <InputField
                  inline
                  size="sm"
                  label="Búsqueda:"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Escriba código o nombre..."
                  className="text-xs font-semibold focus:ring-teal-500/20 bg-white"
                  trailingIcon={<Search size={14} className="text-slate-400" />}
                />
              </div>

              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
              >
                Salir
              </Button>
            </div>
          </div>

          {/* ÁREA DE TABLA */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-h-[320px]">
            {/* renderTabla() debería seguir el estilo de filas con hover teal */}
            {renderTabla()}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
