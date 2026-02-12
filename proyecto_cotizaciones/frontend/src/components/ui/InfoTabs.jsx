// src/cotizaciones/InfoTabs.jsx

import api from "@/services/api";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderClosed,
  Paperclip,
  Phone,
  FileText,
  ChevronsRight,
  FileCheck,
  SquareStar,
  Send,
  BanknoteArrowDown,
  FileSpreadsheet,
  Copy,
  FilePlus,
  Trash,
  MessageSquareMore,
  ChartScatter,
  Check,
  Loader,
  Cog,
  Files,
  User,
  Plus,
  RefreshCcw,
  FileUp,
  Trash2,
  CopyPlus,
  SquareArrowUp,
  SquareArrowDown,
  UserPlus,

  UserCheck,
  Wrench,
  Mail,
  Search,
  Package,
  Briefcase,
  PackageSearch,
} from "lucide-react";
import InputField from "./InputField";
import SelectField from "./SelectField";
import ButtonAction from "./ButtonAction";
import { Button } from "./button";
import AutocompleteField from "./AutocompleteInput";
import ContactCard from "./ContactCard";
import useKeyboardShortcuts from "./useKeyboardShortcuts";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const handleDragEndGrupo = (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  setGruposSuministros((prev) => {
    const entries = Object.entries(prev);

    const oldIndex = entries.findIndex(
      ([key]) => key === active.id
    );

    const newIndex = entries.findIndex(
      ([key]) => key === over.id
    );

    const reordered = arrayMove(entries, oldIndex, newIndex);

    return Object.fromEntries(reordered);
  });
};

export default function InfoTabs({
  dashboardName,
  modo,
  esNueva,
  esVer,
  onChangeTab, // 👈 NUEVO
  activeTab,
  data,        // datos completos de la cotización
  setData,
  tabsToShow,  // tabs personalizados si deseas
  suministros,
  servicios,
  totalesLocales,
  setOpenCondiciones,
  setOpenGenerarCodigo,
  setOpenDescuentos,
  setOpenEnviarCoti,
  setOpenEncargados,
  setOpenContactos,
  setOpenProbabilidad,
  setOpenMensajes,
  mensajes=[],
  setOpenSeg,
  setOpenCopia,
  setOpenNuevaVersion,
  setOpenRetornar,
  setOpenEliminar,
  openEnviarAprobacion,
  setOpenEnviarAprobacion,
  openAdjuntos,
  setOpenAdjuntos,
  campoError,
  setOpenAsignar,
  onAbrirCotizacionPDF,
  descuentosForm,
  // SUMINISTROS
  setOpenGrupoModal,
  gruposSuministros,
  setGruposSuministros,
  openItemModal,
  setOpenItemModal,
  setOpenRegistroItem,
  openServicioModal,
  handleRefreshSuministros,
  loadingSuministros,
  onDuplicarGrupo,
  setOpenImportarXLS1,
  setOpenImportarXLS2,
  // SERVICIOS
  gruposServicios, 
  setGruposServicios,
  setServicioActivo,
  selectedSubgrupoId,
  setSelectedSubgrupoId,
  setOpenServicioModal,
  selectedServicioId, 
  setSelectedServicioId,
  openSubgrupoModal,
  handleDuplicarServicio,
  setOpenSubgrupoModal,
  setSubgrupoActivo,
  selectedTipoCodigo,
  setSelectedTipoCodigo,
  onAgregarItemServicio,
  openRegistroMO,
  setOpenRegistroMO,
  setOpenRegistroGS,
  setOpenRegistroOtros,
  grupoActivo,
  setGrupoActivo,
  itemActivo,
  setItemActivo,
  onReporteSuministros,
  onExportSuministrosExcel,
  onReporteServicios,
  onReporteDetallado,
  onExportDetalladoExcel,
  onReporteResumen,
}) {

  const [clientes, setClientes] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // ==============================
  // CONTROL DE EDICIÓN POR ENVÍO
  // ==============================
  const envio = Number(data?.envio ?? 0);

  // Editable solo si envio es 0, 1 o 2
  const canEdit = envio !== 3;

  // Solo lectura cuando envio es 3
  const isReadOnly = !canEdit;

  // Handler único para edición de campos
  const handleFieldChange = (field, value) => {
    if (!canEdit) {
      console.warn("Edición bloqueada: envío finalizado");
      return;
    }

    setData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // ========================
  // Configuración de tabs 
  // ========================
  const TAB_CONFIG = {
    CotizacionModal: ["datos"],
  };

  const defaultTabs = TAB_CONFIG[dashboardName] || ["datos"];
  const activeTabs = tabsToShow?.length ? tabsToShow : defaultTabs;

  //  Grid dinámico según cantidad de pestañas activas
  const totalTabs = activeTabs.length + 1; // +1 por el Total

  const gridCols =
    totalTabs === 1 ? "grid-cols-1" :
    totalTabs === 2 ? "grid-cols-2" :
    totalTabs === 3 ? "grid-cols-3" :
    totalTabs === 4 ? "grid-cols-4" :
    totalTabs === 5 ? "grid-cols-5" :
    "grid-cols-6";

  //======================
  // BUSCADOR INTELGENTE
  //======================
  const normalizeText = (text = "") =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const highlightMatch = (text, query) => {

    const cleanQuery = normalizeText(query);

    if (!cleanQuery) return text;

    return text.split(/(\s+)/).map((part, i) =>
      normalizeText(part).includes(cleanQuery) ? (
        <span
          key={i}
          className="bg-yellow-200/70 rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };
    
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

  // ======= CLIENTES =======
  const clienteRef = useRef(null);

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteFocused, setClienteFocused] = useState(false);
  const [clienteSelected, setClienteSelected] = useState(false);
  const [highlightClienteIndex, setHighlightClienteIndex] = useState(-1);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);

  // Fetch clientes desde el backend
  const fetchClientesInline = async (q = "") => {
    setClienteLoading(true);
    try {
      const { data: res } = await api.get("/cotizaciones/clientes/", {
        params: { q }
      });
      setClienteResults(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("❌ Error buscando clientes:", err);
      setClienteResults([]);
    } finally {
      setClienteLoading(false);
    }
  };

  // Seleccionar cliente
  const handleClienteSelect = (cliente) => {
    setData(prev => ({
      ...prev,
      cliente_codigo: String(cliente.codigo),
    }));

    setClienteQuery(cliente.nombre); // mostrar nombre
    setShowClienteDropdown(false);
    setClienteSelected(true);
    setHighlightClienteIndex(-1);
  };

  // Debounce al escribir
  useEffect(() => {
    if (!clienteFocused || isReadOnly) return;

    const t = setTimeout(() => {
      fetchClientesInline(clienteQuery.trim());
      setShowClienteDropdown(true);
    }, 300);

    return () => clearTimeout(t);
  }, [clienteQuery, clienteFocused]);

  // Reset si query vacía
  useEffect(() => {
    if (!clienteQuery) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      setHighlightClienteIndex(-1);
    }
  }, [clienteQuery]);

  // Click fuera del input
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) {
        setShowClienteDropdown(false);
        setHighlightClienteIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  //=============
  // ENCARGADOS
  //=============
  const [encargadoQuery, setEncargadoQuery] = useState("");
  const [encargadosResults, setEncargadosResults] = useState([]);
  const [encargadosLoading, setEncargadosLoading] = useState(false);
  const [showEncargadosDropdown, setShowEncargadosDropdown] = useState(false);
  const [highlightEncargadoIndex, setHighlightEncargadoIndex] = useState(-1);
  const [encargadoFocused, setEncargadoFocused] = useState(false);

  const encargadosRef = useRef(null);

  // 🔁 hidrata input desde DB (cliente_nombre > nombr)
  useEffect(() => {
    if (!encargadoFocused) {
      if (data.cliente_nombre) {
        setEncargadoQuery(data.cliente_nombre);
      } else if (data.nombr) {
        setEncargadoQuery(data.nombr);
      } else {
        setEncargadoQuery("");
      }
    }
  }, [data.cliente_nombre, data.nombr, encargadoFocused]);

  // 🔎 búsqueda con debounce
  useEffect(() => {
    if (!encargadoFocused) return;
    if (isReadOnly || !data.cliente_codigo) return;

    const q = encargadoQuery.trim();

    const t = setTimeout(() => {
      fetchEncargadosInline(q);
      setShowEncargadosDropdown(true);
    }, 300);

    return () => clearTimeout(t);

  }, [encargadoQuery, data.cliente_codigo, encargadoFocused, isReadOnly]);

  // 🧹 si borran manualmente → limpia campos derivados
  useEffect(() => {
    if (!encargadoFocused) return;

    if (encargadoQuery === "") {
      setData(prev => ({
        ...prev,
        cliente_nombre: "",
        nombr: "",
        codir: "",
        cargo: "",
        mailr: "",
        teler: "",
        movir: "",
      }));

      setEncargadosResults([]);
      setShowEncargadosDropdown(false);
      setHighlightEncargadoIndex(-1);
    }
  }, [encargadoQuery, encargadoFocused]);

  // 🔄 reset cuando cambia cliente
  useEffect(() => {
    setEncargadoQuery("");
    setEncargadosResults([]);
    setShowEncargadosDropdown(false);
    setHighlightEncargadoIndex(-1);

    setData(prev => ({
      ...prev,
      cliente_nombre: "",
      nombr: "",
      codir: "",
      cargo: "",
      mailr: "",
      teler: "",
      movir: "",
    }));

  }, [data.cliente_codigo]);

  // 🖱 click fuera
  useEffect(() => {

    const handleClickOutside = (e) => {
      if (
        encargadosRef.current &&
        !encargadosRef.current.contains(e.target)
      ) {
        setShowEncargadosDropdown(false);
        setHighlightEncargadoIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // 🔁 fetch aislado
  const fetchEncargadosInline = async (q = "") => {

    if (!data.cliente_codigo) return;

    setEncargadosLoading(true);

    try {

      const { data: res } = await api.get(
        `/clientes/${data.cliente_codigo}/encargados/`,
        { params: { q } }
      );

      setEncargadosResults(Array.isArray(res) ? res : []);

    } catch (err) {

      console.error("❌ Error buscando encargados:", err);
      setEncargadosResults([]);

    } finally {

      setEncargadosLoading(false);
    }
  };

  // ✅ selección
  const handleEncargadoSelect = (encargado) => {

    setData(prev => ({
      ...prev,
      cliente_nombre: encargado.representante,
      nombr: encargado.representante, // 🔁 espejo por compatibilidad
      codir: String(encargado.codigo),
      cargo: encargado.cargo,
      mailr: encargado.email,
      teler: encargado.telefono,
      movir: encargado.movil,
    }));

    setEncargadoQuery(encargado.representante);
    setShowEncargadosDropdown(false);
    setHighlightEncargadoIndex(-1);
  };

  //================
  // COMERCIAL
  //================
  const [comercialQuery, setComercialQuery] = useState("");
  const [comercialResults, setComercialResults] = useState([]);
  const [comercialLoading, setComercialLoading] = useState(false);
  const [showComercialDropdown, setShowComercialDropdown] = useState(false);
  const [highlightComercialIndex, setHighlightComercialIndex] = useState(-1);
  const [comercialFocused, setComercialFocused] = useState(false);

  const comercialRef = useRef(null);

  const fetchComercialInline = async (q = "") => {

    setComercialLoading(true);

    try {
      const { data } = await api.get("/usuarios-activos/", {
        params: { q }
      });

      let usuarios = Array.isArray(data) ? data : [];

      // (opcional luego)
      // usuarios = usuarios.filter(u => u.area === 3);

      setComercialResults(usuarios);

    } catch (err) {
      console.error("❌ Error buscando comerciales:", err);
      setComercialResults([]);
    } finally {
      setComercialLoading(false);
    }
  };

  const handleComercialSelect = (comercial) => {
    setData(prev => ({
      ...prev,

      // Identidad
      nombc: comercial.nomb_cort_usu,
      codic: String(comercial.usuario_usu),

      // Contacto
      mailc: comercial.email_usu || "",

      telec: comercial.telefono || "",   // 👈 ojo nombre
      mov1c: comercial.movil1 || "",
      mov2c: comercial.movil2 || "",
      mov3c: comercial.movil3 || "",
    }));

    setComercialQuery(comercial.nomb_cort_usu);

    setShowComercialDropdown(false);
    setHighlightComercialIndex(-1);
  };

  useEffect(() => {

    if (!comercialFocused) return;
    if (isReadOnly) return;

    const t = setTimeout(() => {
      fetchComercialInline(comercialQuery.trim());
      setShowComercialDropdown(true);
    }, 300);

    return () => clearTimeout(t);

  }, [comercialQuery, comercialFocused]);

  useEffect(() => {
    setComercialQuery("");
    setComercialResults([]);
    setShowComercialDropdown(false);
    setHighlightComercialIndex(-1);
  }, []);

  useEffect(() => {

    const handleClickOutside = (e) => {
      if (comercialRef.current && !comercialRef.current.contains(e.target)) {
        setShowComercialDropdown(false);
        setHighlightComercialIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  //================
  // TECNICO
  //================
  const [tecnicoQuery, setTecnicoQuery] = useState("");
  const [tecnicoResults, setTecnicoResults] = useState([]);
  const [tecnicoLoading, setTecnicoLoading] = useState(false);
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false);
  const [highlightTecnicoIndex, setHighlightTecnicoIndex] = useState(-1);
  const [tecnicoFocused, setTecnicoFocused] = useState(false);

  const tecnicoRef = useRef(null);

  const fetchTecnicoInline = async (q = "") => {

    setTecnicoLoading(true);

    try {
      const { data } = await api.get("/usuarios-activos/", {
        params: { q }
      });

      let usuarios = Array.isArray(data) ? data : [];

      // luego si quieres:
      // usuarios = usuarios.filter(u => u.area === 5);

      setTecnicoResults(usuarios);

    } catch (err) {
      console.error("❌ Error buscando técnicos:", err);
      setTecnicoResults([]);
    } finally {
      setTecnicoLoading(false);
    }
  };

  const handleTecnicoSelect = (tecnico) => {
    setData(prev => ({
      ...prev,

      // Identidad
      nombt: tecnico.nomb_cort_usu,
      codit: String(tecnico.usuario_usu),

      // Contacto
      mailt: tecnico.email_usu || "",

      telet: tecnico.telefono || "",
      mov1t: tecnico.movil1 || "",
      mov2t: tecnico.movil2 || "",
      mov3t: tecnico.movil3 || "",
    }));

    setTecnicoQuery(tecnico.nomb_cort_usu);

    setShowTecnicoDropdown(false);
    setHighlightTecnicoIndex(-1);
  };

  useEffect(() => {

    if (!tecnicoFocused) return;
    if (isReadOnly) return;

    const t = setTimeout(() => {
      fetchTecnicoInline(tecnicoQuery.trim());
      setShowTecnicoDropdown(true);
    }, 300);

    return () => clearTimeout(t);

  }, [tecnicoQuery, tecnicoFocused]);

  useEffect(() => {
    setTecnicoQuery("");
    setTecnicoResults([]);
    setShowTecnicoDropdown(false);
    setHighlightTecnicoIndex(-1);
  }, []);

  useEffect(() => {

    const handleClickOutside = (e) => {
      if (tecnicoRef.current && !tecnicoRef.current.contains(e.target)) {
        setShowTecnicoDropdown(false);
        setHighlightTecnicoIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // ===========
  // OPCIONES
  // ===========
  const probOptions = [
    { id: "0", nombre: "Baja" },
    { id: "1", nombre: "Media" },
    { id: "2", nombre: "Alta" },
    { id: "3", nombre: "Muy Alta" },
  ];

  const tipoOptions = [
    { id: "P", nombre: "Proyecto" },
    { id: "S", nombre: "Servicio" },
    { id: "V", nombre: "Venta" },
  ];

  const areasOptions = [
    { id: "1", nombre: "Industria" },
    { id: "2", nombre: "Mineria" },
    { id: "3", nombre: "Mantenimiento" },
    { id: "4", nombre: "Petroquimica" },
    { id: "8", nombre: "Seguridad de Maquinaria" },
  ];

  const estadosOptions = [
    { id: "1", nombre: "Adjudicado" },
    { id: "2", nombre: "Pendiente" },
    { id: "3", nombre: "Perdida" },
    { id: "4", nombre: "Anulado" },
    { id: "5", nombre: "Postergada" },
    { id: "6", nombre: "En Seguimiento" },
  ];

  const monedasOptions = [
    { id: "S", nombre: "Soles" },
    { id: "D", nombre: "Dólares" },
  ];

  const unidadOptions =[
    { id: "D", nombre: "Dias" },
    { id: "S", nombre: "Semanas" },
    { id: "M", nombre: "Meses" },
  ]

  const igvOptions =[
    { id: "N", nombre: "No Incluye" },
    { id: "S", nombre: "Incluye" },
  ]

  const formasPagoOptions = [
    { id: "100% Contra Entrega", nombre: "100% Contra Entrega" },
    { id: "100% Factura a 30 días", nombre: "100% Factura a 30 días" },
    { id: "100% Factura a 42 días", nombre: "100% Factura a 42 días" },
    { id: "100% Factura a 60 días", nombre: "100% Factura a 60 días" },
    { id: "100% Factura a 180 días, vía factoring", nombre: "100% Factura a 180 días, vía factoring" },
    { id: "50% Adelanto, 50% Contra Entrega", nombre: "50% Adelanto, 50% Contra Entrega" },
    { id: "100% Factura a 180 días", nombre: "100% Factura a 180 días" },
  ]

  // =====================
  // UTIL: PARSE COG
  // =====================
  const parseCog = (cog = "") => {
    const str = String(cog).padStart(4, "0");

    const contador = str.substring(0, 2); // primeros 2 → contador
    const tipoCode = str.substring(2, 4); // últimos 2 → tipo real

    const tipoMap = {
      "01": "EQUIPOS",
      "02": "MATERIALES",
    };

    return {
      contador,
      tipo: tipoMap[tipoCode] || "OTROS",
    };
  };

  // =====================
  // TABLAS SUMINISTROS
  // =====================
  const grupos = {};

  // 1) Crear grupos usando nig = 0
  suministros
    .filter(item => Number(item.nig) === 0)
    .forEach(header => {
      const { contador, tipo } = parseCog(header.cog);

      grupos[header.cog] = {
        cog: header.cog,
        contador,
        tipo,
        titulo: header.nog,
        header,
        cantidad: Number(header.can || 1), // 🔹 cantidad del grupo (del modal o DB)
        items: [],
      };
    });

  // 2) Agregar filas hijas (nig > 0)
  suministros
    .filter(item => Number(item.nig) > 0)
    .forEach(item => {
      if (grupos[item.cog]) {
        grupos[item.cog].items.push(item);
      }
    });

  // 3) Calcular subtotal y totalPorGrupo para cada grupo
  Object.values(grupos).forEach(grp => {
    const subtotal = grp.items.reduce((acc, it) => acc + (Number(it.tot) || 0), 0);
    grp.subtotal = subtotal;                     // suma de totales de items
    grp.totalPorGrupo = subtotal * (grp.cantidad || 1); // multiplicado por cantidad del grupo
  });

  // Mover Grupos e Items
  const gruposOrdenados = useMemo(() => {
    const base =
      Object.keys(gruposSuministros || {}).length > 0
        ? gruposSuministros
        : grupos;

    return Object.entries(base).map(([cog, grupo]) => ({
      ...grupo,
      cog,
      items: grupo.items || [],
    }));
  }, [gruposSuministros, grupos]);

  const setBaseGrupos = (updater) => {
    if (Object.keys(gruposSuministros || {}).length > 0) {
      setGruposSuministros(updater);
    } else {
      setGrupos(updater);
    }
  };

  function SortableGrupoRow({ id, children, className = "" }) {
    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
    } = useSortable({
      id,
      data: {
        type: "grupo",
        cog: id,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-slate-100 border-b border-slate-300 ${className}`}
      >
        {children}
      </tr>
    );
  }

  function SortableItemRow({
    item,
    index,
    cog,
    grupo,
    selectedItems,
    handleRowClick,
    handleEliminarItem,
    setGrupoActivo,
    setItemActivo,
    setOpenItemModal,
    hoverTimerRef,
    setGhostItem,
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      } = useSortable({
        id: item.id,
        data: {
          type: "item",
          cog,
        },
      });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.55 : 1,
    };

    const isSelected = selectedItems.some(
      (s) => s.cog === cog && s.itemId === item.id
    );

    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setGrupoActivo(cog);
          setItemActivo(item);
          setOpenItemModal(true);
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;

          hoverTimerRef.current = setTimeout(() => {
            if (!el) return;

            const rect = el.getBoundingClientRect();
            if (!rect) return;

            setGhostItem({
              cog,
              item,
              anchor: rect,
            });
          }, 1500);
        }}
        onMouseLeave={() => {
          clearTimeout(hoverTimerRef.current);
          setGhostItem(null);
        }}
        onClick={(e) => handleRowClick(e, cog, item, index, grupo)}
        className={`
          border-b border-slate-200 cursor-pointer transition-colors
          hover:bg-sky-100/90
          ${isSelected ? "bg-teal-100 ring-2 ring-teal-500/40" : ""}
        `}
      >
        {/* ===== HANDLE DRAG SOLO EN NRO ===== */}
        <td
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="py-1.5 text-center font-bold text-slate-500 border-r border-slate-100 bg-slate-50/30 cursor-grab active:cursor-grabbing select-none"
        >
          {index + 1}
        </td>

        <td className="px-2 py-1 text-slate-900 border-r border-slate-100 font-mono text-[10px] font-semibold tracking-tighter">
          {item.cod}
        </td>

        <td className="px-3 py-1 text-slate-800 border-r border-slate-100 font-semibold leading-snug">
          {item.des}
        </td>

        <td className="px-2 py-1 text-slate-700 border-r border-slate-100 text-center text-[10px] font-medium uppercase">
          {item.pro}
        </td>

        <td className="px-1 py-1 text-slate-700 border-r border-slate-100 text-center font-bold">
          {item.tde}
        </td>

        <td className="px-1 py-1 text-slate-900 border-r border-slate-100 text-center font-black">
          {item.can}
        </td>

        <td className="px-2 py-1 text-slate-700 border-r border-slate-100 text-right pr-3 font-medium">
          {Number(item.val).toFixed(2)}
        </td>

        <td className="px-2 py-1 text-slate-900 border-r border-slate-100 text-right pr-3 font-black bg-slate-50/50">
          {Number(item.tot).toFixed(2)}
        </td>

        <td className="px-1 py-1 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEliminarItem(cog, item.id);
            }}
            className="p-1 text-slate-300 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    );
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    setBaseGrupos((prev) => {
      const entries = Object.entries(prev).map(([cog, grupo]) => [
        cog,
        {
          ...grupo,
          items: [...(grupo.items || [])],
        },
      ]);

      // =====================
      // 🔵 MOVER GRUPOS
      // =====================
      if (activeType === "grupo" && overType === "grupo") {
        const oldIndex = entries.findIndex(([c]) => c === active.id);
        const newIndex = entries.findIndex(([c]) => c === over.id);

        if (oldIndex === -1 || newIndex === -1) return prev;

        const reordered = arrayMove(entries, oldIndex, newIndex);

        const normalizados = renumerarGrupos(
          reordered.map(([_, grupo]) => grupo)
        );

        return Object.fromEntries(
          normalizados.map((g) => [g.cog, g])
        );
      }

      // =====================
      // 🟢 MOVER ITEMS
      // =====================
      if (activeType === "item") {
        const fromCog = active.data.current.cog;
        const toCog =
          over.data.current?.cog ??
          over.id;

        const fromGrupo = entries.find(([c]) => c === fromCog);
        const toGrupo = entries.find(([c]) => c === toCog);

        if (!fromGrupo || !toGrupo) return prev;

        const fromItems = fromGrupo[1].items;
        const toItems = toGrupo[1].items;

        const itemIndex = fromItems.findIndex(
          (i) => i.id === active.id
        );

        if (itemIndex === -1) return prev;

        const [moved] = fromItems.splice(itemIndex, 1);

        if (active.id !== over.id && overType === "item") {
          const overIndex = toItems.findIndex(
            (i) => i.id === over.id
          );

          toItems.splice(overIndex, 0, moved);
        } else {
          toItems.push(moved);
        }

        return Object.fromEntries(entries);
      }

      return prev;
    });
  };

  // Reordenar y renumerar grupos e items
  function renumerarGrupos(gruposOrdenados) {
    return gruposOrdenados.map((grupo, index) => {
      const contador = String(index + 1).padStart(2, "0");

      const cogActual = grupo.cog ?? grupo.id ?? "";

      const tipo = cogActual.slice(2);

      const nuevoCog = `${contador}${tipo}`;

      return {
        ...grupo,
        cog: nuevoCog,
        items: (grupo.items || []).map((item) => ({
          ...item,
          cog: nuevoCog,
        })),
      };
    });
  }

  // Render
  const gruposRender =
    Object.keys(gruposSuministros || {}).length > 0
      ? gruposSuministros
      : grupos;

  // Total General Suministros
  const totalGeneral = Object.values(gruposRender).reduce((acc, grupo) => {
    const subtotal = (grupo.items || []).reduce(
      (sum, it) => sum + (Number(it.tot) || 0),
      0
    );

    const cantidad = Number(grupo.cantidad ?? 1);

    return acc + subtotal * cantidad;
  }, 0);

  // Modal Fantasma
  const [ghostItem, setGhostItem] = useState(null);
  const hoverTimerRef = useRef(null);

  function GhostPreview({ item, anchor, onEdit }) {
    if (!item || !anchor) return null;

    return (
      <div
        className="fixed z-[90] w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in"
        style={{
          top: Math.max(
            anchor.top - 50,
            200
          ),
          left: Math.min(
            anchor.left + 120,
            window.innerWidth - 440
          )
        }}
        onMouseEnter={() => clearTimeout(hoverTimerRef.current)}
        onMouseLeave={() => setGhostItem(null)}
      >

        {/* HEADER */}
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-[#0d767e] rounded-lg">
              <PackageSearch size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                Vista previa de ítem
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Hover para inspeccionar · Doble clic para editar
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-3 space-y-2  text-[11px]">

          {/* INFO BÁSICA */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
              Información básica
            </span>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
              <GhostRow label="Código" value={item.cod} />
              <GhostRow label="Proveedor" value={item.pro} />
              <GhostRow label="Unidad" value={item.tde} />
              <GhostRow label="Cantidad" value={item.can} />
            </div>

            <div>
              <div className="grid grid-cols-[90px_1fr] gap-2 items-start">
                <span className="text-[10px] uppercase text-slate-500 font-bold pt-0.5">
                  Descripción
                </span>

                <div className="text-xs font-semibold text-slate-700 leading-snug line-clamp-3">
                  {item.des}
                </div>
              </div>

            </div>
          </div>

          {/* COSTOS */}
          <div className="grid grid-cols-2 gap-2">

            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                Costos
              </span>

              <GhostRow label="Costo" value={item.puc} />
              <GhostRow label="Utilidad" value={item.tou} />
              <GhostRow label="Porcentaje" value={item.cau + "%"} />
            </div>

            <div className="bg-[#0d767e]/5 border border-[#0d767e]/10 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-black text-[#0d767e] uppercase tracking-tight">
                Venta
              </span>

              <GhostRow label="Costo total" value={item.toc} />
              <GhostRow label="Precio venta" value={item.val} />
              <GhostRow
                label="Venta total"
                value={item.tot}
                highlight
              />
            </div>

          </div>
        </div>
      </div>
    );
  }

  function GhostRow({ label, value, highlight }) {
    return (
      <div className="flex justify-between gap-2">
        <span className="text-[10px] uppercase text-slate-400 font-bold">
          {label}
        </span>
        <span
          className={`text-xs font-semibold ${
            highlight
              ? "text-[#0d767e] font-black"
              : "text-slate-700"
          }`}
        >
          {Number(value) || value}
        </span>
      </div>
    );
  }

  useEffect(() => {
    return () => clearTimeout(hoverTimerRef.current);
  }, []);

  useKeyboardShortcuts({
    enabled: activeTabs.includes("suministros"),

    hasGrupoActivo: !!grupoActivo,
    hasItemSelected: !!itemActivo,

    onNuevoGrupo: () => {
      setGrupoActivo(null);
      setOpenGrupoModal(true);
    },

    onNuevoItem: () => {
      if (!grupoActivo) return;
      setItemActivo(null);
      setOpenItemModal(true);
    },

    onEditarItem: () => {
      if (!itemActivo) return;
      setOpenItemModal(true);
    },

    onEliminarItem: () => {
      if (!itemActivo || !grupoActivo) return;
      handleEliminarItem(grupoActivo, itemActivo.id);
    },

    onClose: () => {
      setGhostItem(null);
      setOpenItemModal(false);
      setOpenGrupoModal(false);
    }
  });

  function handleGhostEnter(e, item, columnIndex) {
    if (columnIndex === 0 || columnIndex === 8) return; // 1 y 9 visualmente

    hoverTimerRef.current = setTimeout(() => {
      setGhostItem({
        item,
        anchor: e.currentTarget.getBoundingClientRect(),
      });
    }, 600);
  }

  // Multi Select + Atajos
  const [selectedItems, setSelectedItems] = useState([]);
  // [{ cog, itemId }]
  const lastSelectedRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName;

      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;

      const key = e.key.toLowerCase();

      // ===== ATAJOS GLOBALES =====
      if (e.ctrlKey && key === "g") {
        e.preventDefault();
        handleNuevoGrupo?.();
        return;
      }

      if (e.ctrlKey && key === "n") {
        e.preventDefault();
        handleNuevoItem?.();
        return;
      }

      // ===== desde aqui requieren seleccion =====
      if (!selectedItems.length) return;

      // flatten visible items
      const flat = [];

      Object.entries(gruposRender).forEach(([cog, grupo]) => {
        grupo.items.forEach((it) => {
          flat.push({
            cog,
            id: it.id,
            item: it,
          });
        });
      });

      // solo tomamos el primero como "activo"
      const currentSel = selectedItems[0];

      const index = flat.findIndex(
        (i) =>
          i.cog === currentSel.cog &&
          i.id === currentSel.itemId
      );

      if (index === -1) return;

      // ===== NAVEGACION =====
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = flat[index + 1];
        if (next) {
          setSelectedItems([
            { cog: next.cog, itemId: next.id },
          ]);
          lastSelectedRef.current = {
            cog: next.cog,
            index: index + 1,
          };
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = flat[index - 1];
        if (prev) {
          setSelectedItems([
            { cog: prev.cog, itemId: prev.id },
          ]);
          lastSelectedRef.current = {
            cog: prev.cog,
            index: index - 1,
          };
        }
      }

      // ===== ENTER = EDITAR SOLO SI ES 1 =====
      if (e.key === "Enter" && selectedItems.length === 1) {
        e.preventDefault();

        const current = flat[index];
        setGrupoActivo(current.cog);
        setItemActivo(current.item);
        setOpenItemModal(true);
      }

      // ===== DELETE = BORRAR VARIOS =====
      if (e.key === "Delete") {
        e.preventDefault();

        handleEliminarMultiples?.(selectedItems);
      }

      // ===== CTRL + D = DUPLICAR =====
      if (e.ctrlKey && key === "d") {
        e.preventDefault();

        duplicarMultiples?.(selectedItems);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [selectedItems, gruposRender]);

  const handleRowClick = (e, cog, item, index, grupo) => {
    const key = { cog, itemId: item.id };

    // SHIFT = rango dentro del grupo
    if (e.shiftKey && lastSelectedRef.current) {
      const { index: lastIndex, cog: lastCog } =
        lastSelectedRef.current;

      if (lastCog === cog) {
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);

        const range = grupo.items
          .slice(start, end + 1)
          .map((it) => ({
            cog,
            itemId: it.id,
          }));

        setSelectedItems(range);
      }
    }

    // CTRL = toggle
    else if (e.ctrlKey || e.metaKey) {
      setSelectedItems((prev) => {
        const exists = prev.some(
          (s) =>
            s.cog === cog &&
            s.itemId === item.id
        );

        return exists
          ? prev.filter(
              (s) =>
                !(
                  s.cog === cog &&
                  s.itemId === item.id
                )
            )
          : [...prev, key];
      });
    }

    // CLICK normal
    else {
      setSelectedItems([key]);
    }

    lastSelectedRef.current = {
      cog,
      index,
    };
  };

  // Autofocus
  const [focusField, setFocusField] = useState(null);
  const codigoRef = useRef(null);
  const cantidadRef = useRef(null);
  const precioRef = useRef(null);
  const proveedorRef = useRef(null);

  useEffect(() => {
    if (!openItemModal || !focusField) return;

    const map = {
      codigo: codigoRef,
      cantidad: cantidadRef,
      precio: precioRef,
      proveedor: proveedorRef,
    };

    const ref = map[focusField];

    if (ref?.current) {
      requestAnimationFrame(() => {
        ref.current.focus();
        ref.current.select?.();
      });
    }
  }, [focusField, openItemModal]);

  // Grupo Colapsable
  const [collapsedGrupos, setCollapsedGrupos] = useState({});

  const toggleGrupo = (cog) => {
    setCollapsedGrupos((prev) => ({
      ...prev,
      [cog]: !prev[cog],
    }));
  };

  // =======================
  // TABLA SERVICIOS
  // =======================
  // Diccionario de tipos de subgrupos
  const tipoSubgrupoDict = {
    "04": "MANO DE OBRA",
    "05": "GASTOS SERVICIO",
    "06": "OTROS",
    // agrega más según tu DB
  };

  const ORDEN_SUBGRUPOS = {
    "04": 1, // MANO DE OBRA
    "05": 2, // GASTOS SERVICIO
    "06": 3, // OTROS
  };

  // Normalizador 
  const normalizarTipoSubgrupo = (sub) => {
    if (sub.tipoNombre) return sub;

    return {
      ...sub,
      tipoNombre: tipoSubgrupoDict[sub.tipoCodigo] ?? sub.tipoCodigo,
    };
  };

  // Cargar servicios del backend UNA SOLA VEZ
  React.useEffect(() => {
    if (Array.isArray(servicios) && servicios.length > 0) {
      const normalizados = {};

      servicios.forEach((srv, idxSrv) => {
        const srvId =
          srv.id ??
          srv.codigo ??
          srv.header?.id ??
          `S_BACK_${idxSrv}`;

        // Normalizar subgrupos
        const subgrupos = (srv.subgrupos || []).map((sg, idxSg) => {
          // 🔹 título del subgrupo: siempre usar nog si nig=1
          const titulo =
            sg.nig === 1
              ? sg.nog ?? `SUBGRUPO_${idxSg}`
              : sg.titulo ?? sg.nog ?? `SUBGRUPO_${idxSg}`;

          // 🔹 tipoCodigo: del sg.tipoCodigo si existe, si no últimos 2 dígitos de cog
          const tipoCodigo = sg.tipoCodigo ?? (sg.cog ? sg.cog.slice(-2) : "00");

          // 🔹 tipoNombre para mostrar
          const tipoNombre = tipoSubgrupoDict[tipoCodigo] ?? "DESCONOCIDO";

          return {
            ...sg,
            id: sg.id ?? `SG_BACK_${srvId}_${idxSg}`, // id único
            titulo,
            tipoCodigo,
            tipoNombre,
            items: sg.items || [],
          };
        });

        normalizados[srvId] = {
          ...srv,
          id: srvId,
          subgrupos,
        };
      });

      setGruposServicios(normalizados);
    }
  }, [servicios]);

  // Render
  const serviciosRender = Object.values(gruposServicios);

  // TOTAL GENERAL SERVICIOS
  const totalGeneralServicios = serviciosRender.reduce((acc, servicio) => {
    const subtotalServicio = (servicio.subgrupos || []).reduce(
      (sAcc, sub) =>
        sAcc +
        (sub.items || []).reduce(
          (iAcc, it) => iAcc + (Number(it.tot) || 0),
          0
        ),
      0
    );

    const cantidadServicio = Number(servicio.cantidad) || 1;

    return acc + subtotalServicio * cantidadServicio;
  }, 0);

  // =========
  // GESTIÓN
  // =========
  const GESTION_ACTIONS = {
    C: {
      condicionesGenerales: true,
      asignarIntegro: true,
      generarPDF: true,
      descuentos: true,
      enviarCotizacion: true,
      retornar: true,
      reporteSuministros:true,
      reporteSuministrosXLS:true,
      reporteServicios:true,
      reporteDetallado:true,
      reporteDetalladoXLS:true,
      reporteResumen:true,
      generarCopia: true,
      generarNuevaVersion: true,
      eliminar: true,
      adjuntos: true,
      mensajes:true,
    },
    R: {
      condicionesGenerales: true,
      asignarIntegro: true,
      generarPDF: true,
      descuentos: true,
      enviarCotizacion: true,
      retornar: true,
      reporteSuministros:true,
      reporteSuministrosXLS:true,
      reporteServicios:true,
      reporteDetallado:true,
      reporteDetalladoXLS:true,
      reporteResumen:true,
      generarCopia: true,
      generarNuevaVersion: true,
      eliminar: true,
      adjuntos: true,
      mensajes:true,
    },
    A: {
      condicionesGenerales: true,
      generarCodigo: true,
      generarPDF: true,
      descuentos: true,
      enviarCorreo: true,
      retornar: true,
      reporteSuministros:true,
      reporteSuministrosXLS:true,
      reporteServicios:true,
      reporteDetallado:true,
      reporteDetalladoXLS:true,
      reporteResumen:true,
      generarCopia: true,
      generarNuevaVersion: true,
      eliminar: true,
      adjuntos: true,
      mensajes:true,
      seguimiento: true,
      probabilidad: true,
    },
  };

  // fallback seguro
  const acciones = GESTION_ACTIONS[modo] ?? GESTION_ACTIONS.C;

  // ================
  // ELIMINAR GRUPO
  // ================
  const handleEliminarGrupo = (cog) => {
    if (!confirm("¿Eliminar este grupo y todos sus ítems?")) return;

    setGruposSuministros(prev => {
      const copia = { ...prev };
      delete copia[cog];
      return copia;
    });
  };
  
  // ===============
  // ELIMINAR ITEM
  // ===============
  const handleEliminarItem = (cog, itemId) => {
    setGruposSuministros(prev => ({
      ...prev,
      [cog]: {
        ...prev[cog],
        items: prev[cog].items.filter(item => item.id !== itemId),
      },
    }));
  };

  // =====================
  // ELIMINAR SERVICIO
  // =====================
  const handleEliminarServicio = (servicioId) => {
    if (!confirm("¿Eliminar este servicio y todo su contenido?")) return;

    setGruposServicios(prev => {
      const copia = { ...prev };
      delete copia[servicioId];
      return copia;
    });
  };

  // =====================
  // ELIMINAR SUBGRUPO
  // =====================
  const handleEliminarSubgrupo = (servicioId, subgrupoId) => {
    if (!confirm("¿Eliminar este subgrupo y todos sus ítems?")) return;

    setGruposServicios(prev => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        subgrupos: prev[servicioId].subgrupos.filter(
          sg => sg.id !== subgrupoId
        ),
      },
    }));
  };

  // =====================
  // ELIMINAR ITEM SERVICIO
  // =====================
  const handleEliminarItemServicio = (servicioId, subgrupoId, itemNum) => {
    setGruposServicios(prev => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        subgrupos: prev[servicioId].subgrupos.map(sg =>
          sg.id !== subgrupoId
            ? sg
            : {
                ...sg,
                items: sg.items.filter(it => it.num !== itemNum),
              }
        ),
      },
    }));
  };

  const formatMoney = (v = 0) =>
    Number(v).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  //=============
  // DESCUENTOS
  //=============
  const baseDescuento = (() => {
    if (!descuentosForm.aplicar) return 0;

    switch (descuentosForm.afecto) {
      case "t":
        return totalGeneral + totalGeneralServicios;
      case "su":
        return totalGeneral;
      case "ser":
        return totalGeneralServicios;
      default:
        return 0;
    }
  })();

  const descuentoCalculado = descuentosForm.aplicar
    ? Math.min(Number(descuentosForm.importe || 0), baseDescuento)
    : 0;

  const totalFinalSuministros =
    descuentosForm.aplicar && descuentosForm.afecto === "su"
      ? Math.max(0, totalGeneral - descuentoCalculado)
      : totalGeneral;

  const totalFinalServicios =
    descuentosForm.aplicar && descuentosForm.afecto === "ser"
      ? Math.max(0, totalGeneralServicios - descuentoCalculado)
      : totalGeneralServicios;

  const totalFinal =
    descuentosForm.aplicar && descuentosForm.afecto === "t"
      ? Math.max(
          0,
          totalGeneral + totalGeneralServicios - descuentoCalculado
        )
      : totalGeneral + totalGeneralServicios;

  return (
    <div className="w-full -mt-3">
      <Tabs
        value={activeTab}
        onValueChange={onChangeTab}
        className="w-full m-0 p-0"
      > 

        <TabsList
          className={`grid ${gridCols} gap-2 mb-6 bg-slate-50 border border-slate-200 rounded-[2rem] p-1.5 shadow-inner shadow-slate-200/50`}
        >
          {/* REPETIR ESTA ESTRUCTURA PARA CADA TABS-TRIGGER */}
          {activeTabs.includes("datos") && (
            <TabsTrigger
              value="datos"
              className="
                flex items-center justify-center gap-2
                h-10 sm:h-11
                px-4 sm:px-6
                text-[11px] font-[1000] uppercase tracking-widest
                rounded-[1.5rem]
                transition-all duration-300 ease-in-out
                cursor-pointer
                text-slate-500
                
                /* ESTADO ACTIVO: Siguiendo la línea Teal-50 de la Sidebar */
                data-[state=active]:bg-white
                data-[state=active]:text-[#0d767e]
                data-[state=active]:shadow-md
                data-[state=active]:shadow-teal-100/40
                data-[state=active]:border-teal-100
                
                /* HOVER NO ACTIVO */
                hover:bg-slate-100/80
                hover:text-slate-700
              "
            >
              <FolderClosed className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
          )}

          {activeTabs.includes("suministros") && (
            <TabsTrigger
              value="suministros"
              className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-6 text-[11px] font-[1000] uppercase tracking-widest rounded-[1.5rem] transition-all duration-300 ease-in-out text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#0d767e] data-[state=active]:shadow-md data-[state=active]:shadow-teal-100/40 hover:bg-slate-100/80"
            >
              <Files className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Suministros</span>
            </TabsTrigger>
          )}

          {activeTabs.includes("servicios") && (
            <TabsTrigger
              value="servicios"
              className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-6 text-[11px] font-[1000] uppercase tracking-widest rounded-[1.5rem] transition-all duration-300 ease-in-out text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#0d767e] data-[state=active]:shadow-md data-[state=active]:shadow-teal-100/40 hover:bg-slate-100/80"
            >
              <User className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Servicios</span>
            </TabsTrigger>
          )}

          {activeTabs.includes("gestion") && (
            <TabsTrigger
              value="gestion"
              className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-6 text-[11px] font-[1000] uppercase tracking-widest rounded-[1.5rem] transition-all duration-300 ease-in-out text-slate-500 data-[state=active]:bg-white data-[state=active]:text-[#0d767e] data-[state=active]:shadow-md data-[state=active]:shadow-teal-100/40 hover:bg-slate-100/80"
            >
              <Cog className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Gestión</span>
            </TabsTrigger>
          )}

          {/* TOTAL COTIZACIÓN - ESTILO BADGE PREMIUM */}
          <div
            className="
              flex items-center justify-center gap-2
              h-10 sm:h-11
              px-5 sm:px-7
              text-sm font-black uppercase tracking-[0.15em]
              rounded-[1.5rem]
              bg-green-50 text-green-700
              border border-green-100/50
              shadow-sm shadow-green-200/20
              ml-auto
            "
            title="Total general de la cotización"
          >
            <span className="text-green-700 font-black tracking-normal">Total:</span>
            <span className="text-[14px]">
              $ {formatMoney(totalesLocales.total)}
            </span>
          </div>
        </TabsList>

        {/* DATOS */}
        {activeTabs.includes("datos") && (
          <TabsContent value="datos" className="space-y-3">
            <CardContent className="px-0 -mt-5 pb-1 mb-3">
              
              {/* SECCIÓN SUPERIOR: DATOS GENERALES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                {/* COLUMNA IZQUIERDA: IDENTIFICACIÓN Y CLIENTE */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 text-xs space-y-2">
                  
                  {/* NÚMERO DE COTIZACIÓN / FECHA */}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="relative flex items-center gap-2">
                      <InputField
                        inline
                        size="sm"
                        label="Cotización Nro."
                        value={data?.numero || ""}
                        readOnly
                      />
                      {data?.numero?.trim() ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <Loader className="w-4 h-4 text-gray-500 animate-spin shrink-0" />
                      )}
                    </div>

                    <InputField
                      id="fecha"
                      inline
                      size="sm"
                      label="Fecha:*"
                      type="date"
                      value={data.fecha || ""}
                      onChange={(e) => handleFieldChange("fecha", e.target.value)}
                      readOnly={isReadOnly}
                      className={campoError === "fecha" ? "bg-red-50 border-red-200" : ""}
                    />
                  </div>

                  {/* REFERENCIA */}
                  <InputField
                    id="referencia"
                    inline
                    size="sm"
                    label="Referencia:*"
                    as="textarea"
                    rows={2}
                    value={data.referencia || ""}
                    onChange={(e) => handleFieldChange("referencia", e.target.value)}
                    readOnly={isReadOnly}
                    className={`resize-y min-h-[2.5rem] ${campoError === "referencia" ? "bg-red-50 border-red-200" : ""}`}
                  />

                  {/* CLIENTE */}
                  <SelectField
                    id="cliente_codigo"
                    inline
                    size="sm"
                    label="Para:*"
                    value={data.cliente_codigo || ""}
                    onChange={(e) => handleFieldChange("cliente_codigo", e.target.value)}
                    options={clientes.map(c => ({ id: c.codigo, nombre: c.nombre }))}
                    disabled={isReadOnly}
                    className={campoError === "cliente_codigo" ? "border-red-500 ring-1 ring-red-400" : ""}
                  />
                  
                  {/* ATENCIÓN (Buscador de Encargados) */}
                  <div ref={encargadosRef} className="flex items-center gap-2 w-full relative">
                    <label className="text-[11px] font-bold text-gray-600 whitespace-nowrap w-[72px]">
                      Atención:
                    </label>
                    <div className="relative flex-1">
                      <input
                        value={encargadoQuery}
                        disabled={isReadOnly || !data.cliente_codigo}
                        placeholder="Buscar encargado..."
                        onFocus={() => {
                          setEncargadoFocused(true);
                          fetchEncargadosInline("");
                          setShowEncargadosDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => {
                          setEncargadoFocused(false);
                          setShowEncargadosDropdown(false);
                        }, 150)}
                        onChange={(e) => {
                          setEncargadoQuery(e.target.value);
                          setHighlightEncargadoIndex(-1);
                          handleFieldChange("encargado_codigo", "");
                        }}
                        className={`w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all
                          ${campoError === "encargado_codigo" ? "border-red-500 bg-red-50" : "border-gray-300"}
                          ${(isReadOnly || !data.cliente_codigo) ? "bg-gray-100 italic" : "bg-white"}
                        `}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setOpenEncargados(true)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* DROPDOWN ENCARGADOS */}
                      {showEncargadosDropdown && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1">
                          {encargadosLoading ? (
                            <div className="p-3 text-xs text-gray-400 text-center italic">Cargando...</div>
                          ) : encargadosResults.length === 0 ? (
                            <div className="p-3 text-xs text-gray-400 text-center italic">Sin resultados</div>
                          ) : (
                            encargadosResults.map((enc, i) => (
                              <div
                                key={enc.codigo}
                                onMouseDown={() => handleEncargadoSelect(enc)}
                                className={`px-3 py-2 cursor-pointer text-xs border-b border-gray-50 last:border-0
                                  ${highlightEncargadoIndex === i ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 text-gray-700"}
                                `}
                              >
                                <p className="font-bold">{enc.representante}</p>
                                <p className={`text-[10px] ${highlightEncargadoIndex === i ? "text-indigo-100" : "text-gray-500"}`}>
                                  {enc.cargo}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONTACTO DETALLES */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <InputField inline size="sm" label="Cargo:" value={data.cargo || ""} onChange={(e) => handleFieldChange("cargo", e.target.value)} readOnly={isReadOnly} />
                    <InputField inline size="sm" label="Teléfono:" value={data.teler || ""} onChange={(e) => handleFieldChange("teler", e.target.value)} readOnly={isReadOnly} />
                    <InputField inline size="sm" label="Móvil:" value={data.movir || ""} onChange={(e) => handleFieldChange("movir", e.target.value)} readOnly={isReadOnly} />
                    <InputField inline size="sm" label="Email:" value={data.mailr || ""} onChange={(e) => handleFieldChange("mailr", e.target.value)} readOnly={isReadOnly} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                    <SelectField id="prob" inline size="sm" label="Probabilidad:*" value={data.prob || ""} onChange={(e) => handleFieldChange("prob", e.target.value)} options={probOptions} disabled={isReadOnly} className={campoError === "prob" ? "border-red-500" : ""} />
                    <InputField inline size="sm" label="Total Cot.:" value={data.tot_c ? `S/ ${Number(data.tot_c).toFixed(2)}` : "-"} readOnly className="font-bold text-gray-900" />
                  </div>
                </div>

                {/* COLUMNA DERECHA: LOGÍSTICA Y CONDICIONES */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <SelectField id="cotit" inline size="sm" label="Tipo Cotización:*" value={data.cotit || ""} onChange={(e) => handleFieldChange("cotit", e.target.value)} disabled={isReadOnly} options={tipoOptions} className={campoError === "cotit" ? "border-red-500" : ""} />
                    <SelectField id="area_codigo" inline size="sm" label="Área:" value={data.area_codigo || ""} onChange={(e) => handleFieldChange("area_codigo", e.target.value)} disabled={isReadOnly} options={areasOptions} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SelectField inline size="sm" label="Forma de Pago:" value={data.fpago || ""} onChange={(e) => handleFieldChange("fpago", e.target.value)} disabled={isReadOnly} options={formasPagoOptions} />
                    <SelectField inline size="sm" label="Estado:" value={data.estado_codigo || ""} onChange={(e) => handleFieldChange("estado_codigo", e.target.value)} disabled={isReadOnly} options={estadosOptions} />
                  </div>

                  <InputField inline size="sm" label="Lugar Entrega:" value={data.lugar || ""} onChange={(e) => handleFieldChange("lugar", e.target.value)} readOnly={isReadOnly} />

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <InputField inline size="sm" label="Entrega Suministros:" value={data.plazo || "0"} onChange={(e) => handleFieldChange("plazo", e.target.value)} readOnly={isReadOnly} />
                    <SelectField inline size="sm" label="Unidad:" value={data.tot_d || ""} onChange={(e) => handleFieldChange("tot_d", e.target.value)} options={unidadOptions} disabled={isReadOnly} />
                    <InputField inline size="sm" label="Entrega Servicios:" value={data.por_c || "0"} onChange={(e) => handleFieldChange("por_c", e.target.value)} readOnly={isReadOnly} />
                    <SelectField inline size="sm" label="Unidad:" value={data.tot_s || ""} onChange={(e) => handleFieldChange("tot_s", e.target.value)} options={unidadOptions} disabled={isReadOnly} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SelectField inline size="sm" label="Moneda:" value={data.tmone || ""} onChange={(e) => handleFieldChange("tmone", e.target.value)} options={monedasOptions} disabled={isReadOnly} />
                    <InputField inline size="sm" label="T.C.:" value={data.tcamb || ""} onChange={(e) => handleFieldChange("tcamb", e.target.value)} readOnly={isReadOnly} />
                    <SelectField inline size="sm" label="I.G.V.:" value={data.igv || "N"} onChange={(e) => handleFieldChange("igv", e.target.value)} options={igvOptions} disabled={isReadOnly} />
                    <div className="flex gap-1">
                      <InputField inline size="sm" label="Validez:" value={data.valid || "0"} onChange={(e) => handleFieldChange("valid", e.target.value)} readOnly={isReadOnly} className="w-full" />
                      <SelectField size="sm" value={data.acu_s || ""} onChange={(e) => handleFieldChange("acu_s", e.target.value)} options={unidadOptions} disabled={isReadOnly} className="w-20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: CONTACTOS RESPONSABLES */}
              <div className="relative mb-4 mt-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-start">
                  <span className="pr-3 bg-white text-sm font-black text-gray-600 tracking-widest uppercase italic">
                    CONTACTOS
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* --- BLOQUE COMERCIAL --- */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="bg-gradient-to-r from-cyan-300 via-cyan-100 to-white px-4 py-2.5 flex justify-between items-center border-b border-cyan-100">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-cyan-700" />
                      <h4 className="text-xs font-black text-cyan-700 uppercase tracking-tight">Área Comercial</h4>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => setOpenContactos(true)} className="p-1 hover:bg-white/50 rounded-full transition-colors text-cyan-600">
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-50 border-2 border-cyan-500 flex items-center justify-center text-cyan-700 font-black text-lg shadow-inner">
                        {data.nombc ? data.nombc.charAt(0).toUpperCase() : "C"}
                      </div>
                      
                      <div className="flex-1 relative" ref={comercialRef}>
                        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              value={comercialQuery || data.nombc || ""}
                              disabled={isReadOnly}
                              placeholder="Buscar responsable..."
                              onFocus={() => { setComercialFocused(true); fetchComercialInline(""); setShowComercialDropdown(true); }}
                              onBlur={() => setTimeout(() => { setShowComercialDropdown(false); }, 150)}
                              onChange={(e) => {
                                setComercialQuery(e.target.value);
                                if(!e.target.value) setData(prev => ({ ...prev, nombc: "", codco: "", telec: "", mov1c: "", mov2c: "", mailc: "" }));
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
                            />
                          </div>
                          <div className="px-3 py-1 bg-cyan-50/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-cyan-700 truncate uppercase">{data.nombc || "No seleccionado"}</span>
                            <span className="text-[9px] font-mono text-cyan-500 bg-white px-1 rounded border border-cyan-100">ID: {data.codco || "---"}</span>
                          </div>
                        </div>

                        {showComercialDropdown && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                            {comercialLoading ? <div className="p-3 text-xs text-center text-gray-400">Buscando...</div> :
                              comercialResults.map((c, i) => (
                                <div key={i} onMouseDown={() => handleComercialSelect(c)} 
                                  className={`px-3 py-2 text-xs cursor-pointer border-b border-gray-50 last:border-0 ${highlightComercialIndex === i ? "bg-cyan-600 text-white" : "hover:bg-cyan-50 text-gray-700"}`}>
                                  <div className="font-bold">{c.nomb_cort_usu}</div>
                                  <div className={`text-[10px] ${highlightComercialIndex === i ? "text-cyan-100" : "text-gray-400"}`}>{c.mail_usu}</div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                      <InputField inline size="sm" label="Telf." value={data.telec || ""} readOnly className="bg-gray-50/50" />
                      <InputField inline size="sm" label="Email" value={data.mailc || ""} readOnly className="bg-gray-50/50" />
                      <InputField inline size="sm" label="Móvil 1" value={data.mov1c || ""} readOnly className="bg-gray-50/50" />
                      <InputField inline size="sm" label="Móvil 2" value={data.mov2c || ""} readOnly className="bg-gray-50/50" />
                    </div>
                  </div>
                </div>

                {/* --- BLOQUE TÉCNICO --- */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="bg-gradient-to-r from-teal-300 via-teal-100 to-white px-4 py-2.5 flex justify-between items-center border-b border-teal-100">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-teal-700" />
                      <h4 className="text-xs font-black text-teal-700 uppercase tracking-tight">Soporte Técnico</h4>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => setOpenContactos(prev => ({ ...prev, tecnico: true }))} className="p-1 hover:bg-white/50 rounded-full transition-colors text-teal-600">
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-50 border-2 border-teal-500 flex items-center justify-center text-teal-700 font-black text-lg shadow-inner">
                        {data.nombt ? data.nombt.charAt(0).toUpperCase() : "T"}
                      </div>
                      
                      <div className="flex-1 relative" ref={tecnicoRef}>
                        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              value={tecnicoQuery || data.nombt || ""}
                              disabled={isReadOnly}
                              placeholder="Buscar técnico..."
                              onFocus={() => { setTecnicoFocused(true); fetchTecnicoInline(""); setShowTecnicoDropdown(true); }}
                              onBlur={() => setTimeout(() => { setShowTecnicoDropdown(false); }, 150)}
                              onChange={(e) => {
                                setTecnicoQuery(e.target.value);
                                if(!e.target.value) setData(prev => ({ ...prev, nombt: "", codit: "", telet: "", mov1t: "", mov2t: "", mailt: "" }));
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
                            />
                          </div>
                          <div className="px-3 py-1 bg-teal-50/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-teal-700 truncate uppercase">{data.nombt || "No asignado"}</span>
                            <span className="text-[9px] font-mono text-teal-500 bg-white px-1 rounded border border-teal-100">ID: {data.codit || "---"}</span>
                          </div>
                        </div>

                        {showTecnicoDropdown && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                            {tecnicoLoading ? <div className="p-3 text-xs text-center text-gray-400">Buscando...</div> :
                              tecnicoResults.map((t, i) => (
                                <div key={i} onMouseDown={() => handleTecnicoSelect(t)} 
                                  className={`px-3 py-2 text-xs cursor-pointer border-b border-gray-50 last:border-0 ${highlightTecnicoIndex === i ? "bg-teal-600 text-white" : "hover:bg-teal-50 text-gray-700"}`}>
                                  <div className="font-bold">{t.nomb_cort_usu}</div>
                                  <div className={`text-[10px] ${highlightTecnicoIndex === i ? "text-teal-100" : "text-gray-400"}`}>{t.mail_usu}</div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                      <InputField inline size="sm" label="Telf." value={data.telet || ""} readOnly className="bg-gray-50/50" />
                      <InputField inline size="sm" label="Email" value={data.mailt || ""} readOnly className="bg-gray-50/50 font-medium" />
                      <InputField inline size="sm" label="Móvil 1" value={data.mov1t || ""} readOnly className="bg-gray-50/50" />
                      <InputField inline size="sm" label="Móvil 2" value={data.mov2t || ""} readOnly className="bg-gray-50/50" />
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </TabsContent>
        )}

        {/* SUMINISTROS */}
        {activeTabs.includes("suministros") && (
          <TabsContent value="suministros" className="mt-0 outline-none">
            <CardContent className="p-0 border-none shadow-none">
              <div className="overflow-x-auto rounded-md border border-slate-300 shadow-md">
                <table className="min-w-full table-fixed text-[11px] tabular-nums border-collapse">
                  
                  {/* HEADER PRINCIPAL - Máximo Contraste */}
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900 text-white">
                      <th colSpan={9} className="px-3 py-2 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded border border-slate-600">
                              <Package className="h-4 w-4 text-teal-500" />
                              <span className="font-bold tracking-widest text-xs">SUMINISTROS</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setGrupoActivo(null); setOpenGrupoModal(true); }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="font-bold uppercase text-[10px]">Nuevo Grupo</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleRefreshSuministros}
                            disabled={loadingSuministros}
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <RefreshCcw className={`h-4 w-4 text-emerald-400 ${loadingSuministros ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-slate-200 text-slate-800 uppercase font-extrabold text-[10px] tracking-tight border-b border-slate-400">
                      <th className="w-10 py-1 border-r border-slate-300 text-center">Nro</th>
                      <th className="w-[115px] py-1 border-r border-slate-300 text-center">Código</th>
                      <th className="py-1 border-r border-slate-300 text-left px-3">Descripción Suministro</th>
                      <th className="w-[145px] py-1 border-r border-slate-300 text-cente">Proveedor</th>
                      <th className="w-14 py-1 border-r border-slate-300 text-center">U.M.</th>
                      <th className="w-14 py-1 border-r border-slate-300 text-center">Cant</th>
                      <th className="w-24 py-1 border-r border-slate-300 text-center">Valor Unit</th>
                      <th className="w-24 py-1 border-r border-slate-300 text-center ">Total</th>
                      <th className="w-10 py-1 border-r border-slate-300 text-center italic"></th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={gruposOrdenados.map((g) => g.cog)}
                        strategy={verticalListSortingStrategy}
                      >
                        {gruposOrdenados.map((grupo) => {
                          const cog = grupo.cog;

                          const subtotal = grupo.items.reduce((acc, it) => acc + (Number(it.tot) || 0), 0);
                          const canGrupo = Number(grupo.cantidad ?? 1);
                          const tipo = parseCog(grupo.cog ?? cog).tipo;

                          return (
                            <React.Fragment key={cog}>
                              {/* CABECERA DE GRUPO - Visible y con acciones fijas */}
                              <SortableGrupoRow id={cog} grupo={grupo}>
                                  <td className="p-1.5 text-center border-r border-slate-200">
                                    <button 
                                      onClick={() => { setGrupoActivo(cog); setItemActivo(null); setOpenItemModal(true); }}
                                      className="p-1 rounded bg-white border border-slate-400 text-slate-900 hover:bg-slate-400 hover:text-white hover:border-slate-400 transition shadow-sm"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </td>
                                  <td colSpan={6} className="px-3 py-1.5 border-r border-slate-200">
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        title="Agregar EQUIPOS"
                                        className="p-1 rounded bg-white border border-slate-400 text-slate-900 hover:bg-slate-400 hover:text-white hover:border-slate-400 transition shadow-sm"
                                        onClick={() => {
                                          setGrupoActivo(cog);
                                          setItemActivo(null);
                                          setOpenRegistroItem(true);
                                        }}
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </button>
                                      <span
                                        onClick={() => toggleGrupo(cog)}
                                        className={`
                                          inline-flex items-center gap-1
                                          bg-slate-700 text-white
                                          px-2 py-1 rounded
                                          text-[10px] font-black uppercase tracking-tighter
                                          leading-none cursor-pointer
                                          hover:bg-slate-800 transition
                                          select-none
                                        `}
                                      >
                                        {tipo}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => { setGrupoActivo({ ...grupo, cog: grupo.cog ?? grupo.id }); setOpenGrupoModal(true); }}
                                        className="font-black text-slate-800 hover:text-teal-700 transition uppercase text-xs decoration-slate-400 underline-offset-2 hover:underline"
                                      >
                                        {grupo.titulo}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-2 border-r border-slate-200">
                                    <div className="flex justify-center gap-2">
                                      <button 
                                        onClick={() => onDuplicarGrupo?.(cog)} 
                                        title="Duplicar"
                                        className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors border border-blue-200"
                                      >
                                        <CopyPlus className="h-3.5 w-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => { setGrupoActivo(cog); setOpenImportarXLS1(true); }} 
                                        title="Importar XLS"
                                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200"
                                      >
                                        <FileUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Importar Datos de XLS y actualizar"
                                        onClick={() => { setGrupoActivo(cog); setOpenImportarXLS2(true); }}
                                        className="p-1 rounded bg-violet-50 text-violet-700 hover:bg-violet-500 hover:text-white transition-colors border border-violet-200"
                                      >
                                        <FilePlus className="h-3.5 w-3.5" />
                                      </button>                                
                                    </div>
                                  </td>
                                  <td className="p-1 text-center">
                                    <button 
                                      onClick={() => handleEliminarGrupo(cog)} 
                                      className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-500 hover:text-white transition-colors border border-red-200"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                              </SortableGrupoRow>

                              {/* ITEMS / COLAPSADO */}
                              {/* FILA RESUMEN COLAPSADO */}
                              {collapsedGrupos[cog] && (
                                <tr
                                  onClick={() => toggleGrupo(cog)}
                                  className="
                                    bg-slate-50
                                    text-[10px]
                                    border-b border-dashed border-slate-300
                                    cursor-pointer
                                    hover:bg-slate-100
                                    transition
                                  "
                                >
                                  <td colSpan={9} className="px-4 py-2 text-slate-600">
                                    <div className="flex items-center justify-between">
                                      <span className="italic font-semibold">
                                        {grupo.items.length} ítems
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* ITEMS - Estilo Clean Excel */}
                              {!collapsedGrupos[cog] &&
                                grupo.items.map((item, index) => (
                                  <SortableItemRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    cog={cog}
                                    grupo={grupo}
                                    selectedItems={selectedItems}
                                    handleRowClick={handleRowClick}
                                    handleEliminarItem={handleEliminarItem}
                                    setGrupoActivo={setGrupoActivo}
                                    setItemActivo={setItemActivo}
                                    setOpenItemModal={setOpenItemModal}
                                    handleGhostEnter={handleGhostEnter}   // 👈 NUEVO
                                    hoverTimerRef={hoverTimerRef}
                                    setGhostItem={setGhostItem}
                                  />
                              ))}


                              {ghostItem && (
                                <GhostPreview
                                  item={ghostItem.item}
                                  anchor={ghostItem.anchor}
                                  onEdit={() => {
                                    setGrupoActivo(ghostItem.cog);
                                    setItemActivo(ghostItem.item);
                                    setOpenItemModal(true);
                                    setGhostItem(null);
                                  }}
                                />
                              )}

                              {/* SUBTOTAL - Informativo */}
                              <tr className="bg-slate-50 text-[10px] border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-1 text-right font-bold text-slate-600 uppercase tracking-tight">
                                  Subtotal {tipo}:
                                </td>
                                <td className="px-2 py-1 text-right pr-3 font-extrabold text-slate-900 border-l border-slate-200">
                                  {subtotal.toFixed(2)}
                                </td>
                                <td className="bg-white"></td>
                              </tr>

                              {/* TOTAL GRUPO - Fuerte énfasis */}
                              <tr className="bg-white border-b-4 border-slate-200">
                                <td colSpan={5} className="bg-white border-r border-transparent"></td>
                                <td className="py-2 text-center border-x border-slate-200 bg-teal-50/20">
                                  <div className="text-[8px] text-slate-500 uppercase font-black leading-none mb-1">Cant.</div>
                                  <span className="bg-teal-600 text-white px-2 py-0.5 rounded font-black text-xs shadow-sm">
                                    {canGrupo}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-black text-slate-900 uppercase tracking-tighter text-xs">
                                  Total {tipo}:
                                </td>
                                <td className="px-2 py-2 text-right pr-3 font-black text-teal-700 text-[13px] border-l-4 border-teal-600 bg-teal-50/50">
                                  {((subtotal || 0) * (canGrupo || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="bg-white"></td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </SortableContext> 
                    </DndContext>

                    {/* TOTAL GENERAL COTIZACIÓN */}
                    <tr className="bg-slate-900 text-white shadow-2xl border-t-2 border-slate-500">
                      <td colSpan={7} className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-teal-500 font-black uppercase tracking-[0.2em] mb-1">Consolidado Final</span>
                          <span className="text-sm font-black tracking-widest leading-none">TOTAL GENERAL COTIZACIÓN</span>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right pr-4 border-l border-slate-700 bg-slate-800">
                        <span className="text-xl font-black text-white-400 drop-shadow-sm">
                          {totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="bg-slate-900"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </TabsContent>
        )}

        {/* SERVICIOS */}
        {activeTabs.includes("servicios") && (
          <TabsContent value="servicios" className="mt-0 outline-none">
            <CardContent className="p-0 border-none shadow-none">
              <div className="overflow-x-auto rounded-md border border-slate-300 shadow-md">
                <table className="min-w-full table-fixed text-[11px] tabular-nums border-collapse">
                  
                  {/* HEADER PRINCIPAL */}
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900 text-white">
                      <th colSpan={8} className="px-3 py-2 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded border border-slate-600">
                              <Briefcase className="h-4 w-4 text-teal-400" />
                              <span className="font-bold tracking-widest text-xs">SERVICIOS</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenServicioModal(true)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="font-bold uppercase text-[10px]">Nuevo Servicio</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
                          >
                            <RefreshCcw className="h-4 w-4 text-emerald-400" />
                          </button>
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-slate-200 text-slate-800 uppercase font-extrabold text-[10px] tracking-tight border-b border-slate-400">
                      <th className="w-10 py-1 border-r border-slate-300 text-center">Nro</th>
                      <th className="w-[130px] py-1 border-r border-slate-300 text-center">Código</th>
                      <th className="py-1 border-r border-slate-300 text-left px-3">Descripción / Detalle</th>
                      <th className="w-[120px] py-1 border-r border-slate-300 text-center">Lugar</th>
                      <th className="w-14 py-1 border-r border-slate-300 text-center">Cant</th>
                      <th className="w-24 py-1 border-r border-slate-300 text-center">Valor Unit</th>
                      <th className="w-24 py-1 border-r border-slate-300 text-center">Total</th>
                      <th className="w-10 py-1 text-center"></th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {serviciosRender.map((servicio, sIdx) => {
                      const totalServicioBase = (servicio.subgrupos || []).reduce(
                        (acc, sub) => acc + (sub.items || []).reduce((s, it) => s + (Number(it.tot) || 0), 0),
                        0
                      );
                      const cantidadServicio = Number(servicio.cantidad) || 1;
                      const totalFinalServicio = totalServicioBase * cantidadServicio;

                      return (
                        <React.Fragment key={servicio.id || sIdx}>
                          {/* CABECERA DE SERVICIO (Nivel 1) */}
                          <tr className="bg-slate-300 text-slate-800 border-b border-slate-400">
                            <td className="p-1.5 text-center border-r border-slate-400">
                              <button
                                onClick={() => { setSelectedServicioId(servicio.id); setOpenSubgrupoModal(true); }}
                                className="p-1 rounded bg-white border border-slate-400 text-slate-900 hover:bg-slate-500 hover:text-white hover:border-slate-400 transition shadow-sm"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </td>
                            <td colSpan={5} className="px-3 py-1 border-r border-slate-400">
                              <button
                                type="button"
                                onClick={() => { setServicioActivo({ ...servicio }); setOpenServicioModal(true); }}
                                className="font-black text-slate-800 hover:text-blue-700 transition uppercase text-xs decoration-slate-400 underline-offset-2 hover:underline"
                              >
                                {servicio.tituloGeneral || servicio.nombre}
                              </button>
                            </td>
                            <td className="px-2 border-r border-slate-400">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleDuplicarServicio(servicio.id)}
                                  title="Duplicar"
                                  className="p-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-500 hover:text-white transition-colors border border-sky-200"
                                >
                                  <CopyPlus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="p-1 text-center">
                              <button 
                                onClick={() => handleEliminarServicio(servicio.id)} 
                                className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-500 hover:text-white transition-colors border border-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>

                          {/* SUBGRUPOS (Nivel 2) */}
                          {(servicio.subgrupos || []).map((sub, idx) => {
                            const subtotalSubgrupo = (sub.items || []).reduce((acc, it) => acc + (Number(it.tot) || 0), 0);
                            return (
                              <React.Fragment key={sub.id || idx}>
                                <tr className="bg-slate-100 border-b border-slate-300">
                                  <td className="p-1 text-center border-r border-slate-200"></td>
                                  <td colSpan={5} className="px-3 py-1 border-r border-slate-200">
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => onAgregarItemServicio(sub.tipoCodigo, servicio.id, sub.id)}
                                        className="p-0.5 rounded bg-white border border-slate-400 hover:bg-slate-300 transition"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                      <span className="bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter leading-none">
                                        {(sub.tipoNombre || sub.tipoCodigo)}</span>
                                      <button 
                                        onClick={() => { setSubgrupoActivo({ ...sub, servicioId: servicio.id, _key: sub.id }); setOpenSubgrupoModal(true); }}
                                        className="font-black text-slate-800 hover:text-blue-700 transition uppercase text-xs decoration-slate-400 underline-offset-2 hover:underline"
                                      >
                                        {sub.titulo}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1 text-right pr-3 font-bold text-slate-600 border-r border-slate-200 italic">
                                    {subtotalSubgrupo.toFixed(2)}
                                  </td>
                                  <td className="text-center">
                                    <button onClick={() => handleEliminarSubgrupo(servicio.id, sub.id)} className="text-slate-400 hover:text-red-500">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>

                                {/* ITEMS (Nivel 3) */}
                                {(sub.items || []).map((item, iIdx) => (
                                  <tr key={item.num || iIdx} className="hover:bg-teal-50/80 border-b border-slate-100 transition-colors">
                                    <td className="py-1.5 text-center font-bold text-slate-500 border-r border-slate-100 bg-slate-50/30">
                                      <button 
                                        onClick={() => onAgregarItemServicio(item.tipoCodigo, servicio.id, sub.id, item)}
                                        className="w-full hover:text-slate-900"
                                      >
                                        {iIdx + 1}
                                      </button>
                                    </td>
                                    <td className="px-2 py-1 text-slate-900 border-r border-slate-100 font-mono text-[10px] font-semibold tracking-tighter">
                                      {item.cod}
                                    </td>
                                    <td className="px-3 py-1 text-slate-800 border-r border-slate-100 font-semibold leading-snug">
                                      {item.des}
                                    </td>
                                    <td className="px-2 py-1 text-slate-700 border-r border-slate-100 text-center text-[10px] font-medium">
                                      {item.lug}
                                    </td>
                                    <td className="px-1 py-1 text-slate-900 border-r border-slate-100 text-center font-black">
                                      {item.can}
                                    </td>
                                    <td className="px-2 py-1 text-slate-700 border-r border-slate-100 text-right pr-3 font-medium">
                                      {Number(item.val).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1 text-slate-900 border-r border-slate-100 text-right pr-3 font-black bg-slate-50/50">
                                      {Number(item.tot).toFixed(2)}
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      <button onClick={() => handleEliminarItemServicio(servicio.id, sub.id, item.num)} className="p-1 text-slate-300 hover:text-red-600 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {/* TOTAL POR SERVICIO */}
                          <tr className="bg-white border-b-4 border-slate-200">
                            <td colSpan={4} className="bg-white"></td>
                            <td className="py-2 text-center border-x border-slate-200 bg-teal-60/20">
                              <div className="text-[8px] text-slate-500 uppercase font-black mb-1">Cant.</div>
                              <span className="bg-teal-600 text-white px-2 py-0.5 rounded font-black text-xs shadow-sm">
                                {cantidadServicio}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-black text-slate-900 uppercase tracking-tighter text-[10px]">
                              TOTAL SERVICIO:
                            </td>
                            <td className="px-2 py-2 text-right pr-3 font-black text-teal-700 text-[12px] border-l-4 border-teal-500 bg-teal-50/50">
                              {totalFinalServicio.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="bg-white"></td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* TOTAL GENERAL SERVICIOS */}
                    <tr className="bg-slate-900 text-white border-t-2 border-slate-500">
                      <td colSpan={6} className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-teal-500 font-black uppercase tracking-[0.2em] mb-1">Servicios Consolidados</span>
                          <span className="text-sm font-black tracking-widest leading-none">TOTAL GENERAL SERVICIOS</span>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right pr-4 border-l border-slate-700 bg-slate-800">
                        <span className="text-xl font-black text-white-200">
                          {totalGeneralServicios.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="bg-slate-900"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </TabsContent>
        )}

        {/* GESTIÓN */}
        {activeTabs.includes("gestion") && (
          <TabsContent value="gestion" className="space-y-4 animate-in fade-in-50 duration-300">
            <CardContent className="p-4 space-y-9 bg-slate-50/50 rounded-xl">

              {/* SECCIÓN: ADICIONALES */}
              <div className="group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-white shadow-sm border border-cyan-600 px-3 py-1 rounded-lg">
                    <h3 className="text-xs font-black text-cyan-700 tracking-widest uppercase">Adicionales</h3>
                  </div>
                  <div className="flex-grow h-[1px] bg-gradient-to-r from-cyan-600 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex flex-col space-y-2.5">
                    {acciones.condicionesGenerales && (
                      <ButtonAction onClick={() => setOpenCondiciones(true)} color="sky" icon={<FileCheck size={18} />} text="Condiciones Generales de la Cotización" />
                    )}
                    {acciones.generarCodigo && (
                      <ButtonAction onClick={() => setOpenGenerarCodigo(true)} color="emerald" icon={<SquareStar size={18} />} text="Generar Código Automático" />
                    )}
                    {acciones.asignarIntegro && (
                      <ButtonAction onClick={() => setOpenAsignar(true)} color="emerald" icon={<UserPlus size={18} />} text="Asignar Integro a otro Usuario" />
                    )}
                    {acciones.generarPDF && (
                      <ButtonAction onClick={() => onAbrirCotizacionPDF(true)} color="violet" icon={<FileText size={18} />} text="Generar Archivo PDF" />
                    )}
                  </div>

                  <div className="flex flex-col space-y-2.5">
                    {acciones.descuentos && (
                      <ButtonAction onClick={() => setOpenDescuentos(true)} color={descuentosForm.aplicar ? "teal" : "teal"} applied={descuentosForm.aplicar} icon={<BanknoteArrowDown size={18} />} text="Descuentos"/>
                    )}
                    {acciones.enviarCorreo && (
                      <ButtonAction onClick={() => setOpenEnviarCoti(true)} color="indigo" icon={<Send size={18} />} text="Enviar Cotización al Cliente" />
                    )}
                    {acciones.enviarCotizacion && (
                      <ButtonAction onClick={() => setOpenEnviarAprobacion(true)} color="indigo" icon={<SquareArrowUp size={18} />} text="Enviar para su Aprobación" />
                    )}
                    {acciones.retornar && (
                      <ButtonAction onClick={() => setOpenRetornar(true)} color="rose" icon={<SquareArrowDown size={18} />} text="Retornar para su corrección" />
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN: REPORTES */}
              <div className="group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-white shadow-sm border border-cyan-600 px-3 py-1 rounded-lg">
                    <h3 className="text-xs font-black text-cyan-700 tracking-widest uppercase">Reportes</h3>
                  </div>
                  <div className="flex-grow h-[1px] bg-gradient-to-r from-cyan-600 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex flex-col space-y-2.5">
                    {acciones.reporteSuministros && (
                      <ButtonAction onClick={onReporteSuministros} color="cyan" icon={<FileText size={18} />} text="Reporte Suministros" />
                    )}
                    {acciones.reporteSuministrosXLS && (
                      <ButtonAction onClick={onExportSuministrosExcel} color="lime" icon={<FileSpreadsheet size={18} />} text="Reporte Suministros XLS" />
                    )}
                    {acciones.reporteServicios && (
                      <ButtonAction onClick={onReporteServicios} color="purple" icon={<FileText size={18} />} text="Reporte Servicios" />
                    )}
                  </div>
                  <div className="flex flex-col space-y-2.5">
                    {acciones.reporteDetallado && (
                      <ButtonAction onClick={onReporteDetallado} color="amber" icon={<FileText size={18} />} text="Reporte Detallado de Cotización" />
                    )}
                    {acciones.reporteDetalladoXLS && (
                      <ButtonAction onClick={onExportDetalladoExcel} color="indigo" icon={<FileSpreadsheet size={18} />} text="Reporte Detallado XLS" />
                    )}
                    {acciones.reporteResumen && (
                      <ButtonAction onClick={onReporteResumen} color="red" icon={<FileText size={18} />} text="Reporte de Resumen" />
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN: UTILITARIOS */}
              <div className="group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-white shadow-sm border border-cyan-600 px-3 py-1 rounded-lg">
                    <h3 className="text-xs font-black text-cyan-700 tracking-widest uppercase">Utilitarios</h3>
                  </div>
                  <div className="flex-grow h-[1px] bg-gradient-to-r from-cyan-600 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex flex-col space-y-2.5">
                    {acciones.generarCopia && (
                      <ButtonAction onClick={() => setOpenCopia(true)} color="cyan" icon={<Copy size={18} />} text="Generar Copia de la Cotización" />
                    )}
                    {acciones.generarNuevaVersion && (
                      <ButtonAction onClick={() => setOpenNuevaVersion(true)} color="teal" icon={<FilePlus size={18} />} text="Generar Nueva Versión" />
                    )}
                    {acciones.eliminar && (
                      <ButtonAction onClick={() => setOpenEliminar(true)} color="rose" icon={<Trash size={18} />} text="Eliminar Cotización" />
                    )}
                  </div>
                  <div className="flex flex-col space-y-2.5">
                    {acciones.adjuntos && (
                      <ButtonAction onClick={() => setOpenAdjuntos(true)} color="amber" icon={<Paperclip size={18} />} text="Adjuntos" />
                    )}
                    {acciones.mensajes && (
                      <ButtonAction onClick={() => setOpenMensajes(true)} color="indigo" icon={<MessageSquareMore size={18} />} text={`(${mensajes.length}) Mensajes`} />
                    )}
                    {acciones.seguimiento && (
                      <ButtonAction onClick={() => setOpenSeg(true)} color="purple" icon={<Phone size={18} />} text="Seguimiento" />
                    )}
                    {acciones.probabilidad && (
                      <ButtonAction onClick={() => setOpenProbabilidad(true)} color="teal" icon={<ChartScatter size={18} />} text="Probabilidad" />
                    )}
                  </div>
                </div>
              </div>

            </CardContent>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
};