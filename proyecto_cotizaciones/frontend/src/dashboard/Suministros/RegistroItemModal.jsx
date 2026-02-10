import React, { useState, useEffect } from "react";
import api from "@/services/api";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import { PackageSearch, ChevronsRight, Calculator, TrendingUp, Tag } from "lucide-react";
import CodigoItemSuministroModal from "./CodigoItemSuministroModal";
import { calcularItemSegunProveedor } from "./tables/tablaUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function RegistroItemModal({ open, onClose, onConfirm, item, num_reg }) {
  const toNumber = v => Number(v) || 0;
  const [proveedores, setProveedores] = useState([]);
  const [tcamb, setTcamb] = useState(1);
  const [codigoItemOpen, setCodigoItemOpen] = useState(false);
  const [endpointCodigoItem, setEndpointCodigoItem] = useState(null);

  const getEmptyForm = () => ({
    id: null,
    num: null,
    proveedor: "",
    codigo: "",
    descripcion: "",
    marca: "",
    unidad: "UNI",
    cantidad: 1,
    costoPrecio: "",
    utilidad: "",
    porcentaje: "",
    costoTotal: "",
    ventaPrecio: "",
    ventaTotal: "",
    utilidadTotal: "",
  });

  const [form, setForm] = useState(getEmptyForm());
  const resetForm = () => setForm(getEmptyForm());

  // =====================
  // FETCH TCAMB
  // =====================
  useEffect(() => {
    if (!open || !num_reg) return;

    const fetchCotizacion = async () => {
      const res = await api.get(`/cotizaciones/modal/${num_reg}/`);
      setTcamb(Number(res.data.tcamb) || 1);
    };
    fetchCotizacion();
  }, [open, num_reg]);

  // =====================
  // FETCH PROVEEDORES
  // =====================
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get("/cotizaciones/proveedores/");
        setProveedores(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error cargando proveedores", err);
        setProveedores([]);
      }
    };
    fetchProveedores();
  }, []);

  const proveedorOptions = proveedores.map(p => ({
    id: p.codigo,
    nombre: p.nombre
  }));

  // =====================
  // CARGA ITEM PARA EDICIÓN
  // =====================
  useEffect(() => {
    if (!open) return;

    if (item) {

      // Modo edición
      setForm({
        ...getEmptyForm(),
        id: item.id,
        num: item.num,
        proveedor: item.tpr ?? "",
        codigo: item.cod ?? "",
        descripcion: item.des ?? "",
        marca: item.pro ?? "",
        unidad: item.tde ?? "UNI",
        cantidad: item.can ?? 1,
        costoPrecio: item.puc ?? "",
        utilidad: item.tou ?? "",
        porcentaje: item.cau ?? "",
        costoTotal: item.toc ?? "",
        ventaPrecio: item.val ?? "",
        ventaTotal: item.tot ?? "",
        utilidadTotal: (toNumber(item.tou) * toNumber(item.can)).toFixed(2),
      });
    } else {
      // Modo nuevo
      resetForm();
    }
  }, [open, item]);

  // =====================
  // CAMBIO DE CAMPOS
  // =====================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      const cantidad = toNumber(next.cantidad);
      const costo = toNumber(next.costoPrecio);
      let utilidad = toNumber(next.utilidad);

      // 🔹 Porcentaje editable → recalcula utilidad
      if (name === "porcentaje" && costo > 0) {
        utilidad = (toNumber(next.porcentaje) * costo) / 100;
        next.utilidad = utilidad.toFixed(2);
      }

      // 🔹 Utilidad editable → recalcula porcentaje
      if (name === "utilidad" && costo > 0) {
        next.porcentaje = ((utilidad / costo) * 100).toFixed(2);
      }

      const ventaPrecio = costo + utilidad;
      const ventaTotal = ventaPrecio * cantidad;
      const utilidadTotal = utilidad * cantidad;

      next.costoTotal = (costo * cantidad).toFixed(2);
      next.ventaPrecio = ventaPrecio.toFixed(2);
      next.ventaTotal = ventaTotal.toFixed(2);
      next.utilidadTotal = utilidadTotal.toFixed(2);

      return next;
    });
  };

  const handleSubmit = () => {
    if (!form.descripcion.trim() || !form.cantidad) return;
    onConfirm(form);
    handleClose();
  };

  // =====================
  // RESOLVER ENDPOINT
  // =====================
  const resolverEndpointPorProveedor = (proveedor) => {
    const map = {
      "01": "/cotizaciones/rockwell/",
      "03": "/cotizaciones/rittal/",
      "05": "/cotizaciones/ceyesa/",
      "06": "/cotizaciones/alm-articulos/?proveedor=Schneider",
      "07": "/cotizaciones/alm-articulos/?proveedor=LS Industrial Systems",
      "99": "/cotizaciones/alm-articulos/?proveedor=OTROS",
    };
    return map[proveedor] ?? null;
  };

  useEffect(() => {
    if (!open || !form.proveedor || item) return;
    setForm(prev => ({ ...prev, codigo: "", descripcion: "", marca: "", unidad: "UNI" }));
  }, [form.proveedor, open, item]);

  const handleClose = () => {
    resetForm();
    setCodigoItemOpen(false);
    onClose();
  };

  // =====================
  // BUSCAR POR CÓDIGO
  // =====================
  useEffect(() => {
    if (!open || !form.codigo || !form.proveedor || item) return;

    const buscarPorCodigo = async () => {
      try {
        const endpoint = resolverEndpointPorProveedor(form.proveedor);
        if (!endpoint) return;

        const res = await api.get(endpoint, { params: { search: form.codigo } });
        const encontrado = Array.isArray(res.data)
          ? res.data.find(i => String(i.codigo).toUpperCase() === String(form.codigo).toUpperCase())
          : null;

        if (!encontrado) return;

        const normalizado = calcularItemSegunProveedor(encontrado, form.proveedor, tcamb, toNumber(form.cantidad));
        setForm(prev => ({ ...prev, ...normalizado, cantidad: prev.cantidad }));
      } catch (err) {
        console.error("❌ Error buscando por código", err);
      }
    };

    buscarPorCodigo();
  }, [form.codigo, form.proveedor, open, tcamb, form.cantidad, item]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
        
        {/* HEADER IDENTICO AL DE GRUPOS */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <PackageSearch size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Registro de Ítem
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Gestión de suministros, costos y márgenes
              </p>
            </div>
          </div>
        </div>

        {/* CONTENIDO FORMULARIO (p-2 para el contenedor externo como el de Grupos) */}
        <div className="p-2 space-y-2">
          
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-teal-600" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Información Básica</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                inline size="sm" label="Tipo proveedor:" name="proveedor"
                value={form.proveedor} onChange={handleChange} options={proveedorOptions}
                className="text-xs font-semibold focus:ring-teal-500/20"
              />
              <InputField
                inline size="sm" label="Código ítem:" name="codigo" value={form.codigo} onChange={handleChange}
                className="text-xs font-semibold focus:ring-teal-500/20"
                trailingIcon={
                  <button
                    type="button" disabled={!form.proveedor}
                    className={`ml-1 transition ${!form.proveedor ? "text-gray-300" : "text-[#0d767e] hover:scale-110"}`}
                    onClick={() => {
                      const endpoint = resolverEndpointPorProveedor(form.proveedor);
                      if (endpoint) { setEndpointCodigoItem(endpoint); setCodigoItemOpen(true); }
                    }}
                  >
                    <ChevronsRight size={16} />
                  </button>
                }
              />
            </div>

            {/* DESCRIPCIÓN CON TU FORMATO ORIGINAL */}
            <div className="flex items-start gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[85px] pt-1">
                Descripción:
              </label>
              <textarea
                name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2 py-1.5 resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white"
                placeholder="Ingrese descripción del ítem"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <InputField inline size="sm" label="Marca:" name="marca" value={form.marca} onChange={handleChange} />
              <InputField inline size="sm" label="Unidad:" name="unidad" value={form.unidad} onChange={handleChange} />
              <InputField inline size="sm" type="number" label="Cantidad:" name="cantidad" value={form.cantidad} onChange={handleChange} />
            </div>
          </div>

          {/* SECCIÓN 2: GRID INFERIOR (COSTOS VS RESUMEN) */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* COSTOS Y UTILIDAD */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-teal-600" />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Costos y Utilidad</span>
              </div>
              <div className="space-y-3">
                <InputField inline size="sm" label="Costo:" name="costoPrecio" type="number" value={form.costoPrecio} onChange={handleChange} />
                <InputField inline size="sm" label="Utilidad:" name="utilidad" type="number" value={form.utilidad} onChange={handleChange} />
                <InputField inline size="sm" label="Porcentaje:" name="porcentaje" type="number" value={form.porcentaje} onChange={handleChange} />
              </div>
            </div>

            {/* RESUMEN DE VENTA */}
            <div className="bg-[#0d767e]/5 border border-[#0d767e]/10 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#0d767e]" />
                <span className="text-[11px] font-black text-[#0d767e] uppercase tracking-tight">Resumen de Venta</span>
              </div>
              <div className="space-y-1">
                <InputField inline size="sm" label="Costo total:" value={form.costoTotal} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Precio venta:" value={form.ventaPrecio} readOnly className="bg-transparent border-none text-[11px]" />
                <InputField inline size="sm" label="Venta total:" value={form.ventaTotal} readOnly className="bg-transparent border-none font-black text-[#0d767e] text-sm" />
                <InputField inline size="sm" label="Utilidad tot:" value={form.utilidadTotal} readOnly className="bg-transparent border-none font-bold text-teal-700 text-[11px]" />
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER CON VARIANT GHOST */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <Button
            variant="ghost" onClick={handleClose}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all"
          >
            Cancelar
          </Button>
          <Button
            variant="ghost" onClick={handleSubmit}
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-700 hover:bg-teal-100 rounded-xl transition-all"
          >
            Aceptar
          </Button>
        </div>

        <CodigoItemSuministroModal
          open={codigoItemOpen} endpoint={endpointCodigoItem} tcamb={tcamb} proveedor={form.proveedor}
          onClose={() => setCodigoItemOpen(false)}
          onSelect={(item) => {
            const normalizado = calcularItemSegunProveedor(item, form.proveedor, tcamb, toNumber(form.cantidad));
            setForm((prev) => ({ ...prev, ...normalizado }));
            setCodigoItemOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RegistroItemModal;
