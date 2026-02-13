// src/dashboard/layout/DashboardLayout.jsx
import React, { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  BarChart2,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logo from "@/assets/logo.png";
import api from "@/services/api"; // tu servicio de API
import "@/styles/Home.css"; // Tailwind global
import GlobalSearchModal from "../../components/global/GlobalSearchModal";

const SIDEBAR_ITEMS = [
  {
    section: "Cotizaciones",
    items: [
      { to: "/dashboard/cotizaciones-home", label: "Cotizaciones Home", icon: FileText },
      { to: "/dashboard/cotizaciones", label: "Cotizaciones", icon: FileText },
      { to: "/dashboard/revision-cotizacion", label: "Revisión Cotización", icon: FileText },
      { to: "/dashboard/aprobacion-cotizacion", label: "Aprobación Cotización", icon: FileText },
      { to: "/dashboard/seguimiento-cotizaciones", label: "Seguimiento Cotizaciones", icon: BarChart2 },
    ],
  },
];

const NavSectionTitle = ({ title }) => (
  <div className="text-xs uppercase text-gray-400 font-semibold px-4 pt-6 pb-1">
    {title}
  </div>
);

const SidebarLink = ({ to, label, icon: Icon, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`relative group flex items-center gap-3 px-4 py-2 rounded-md text-xs transition-all duration-200 
        ${isActive ? "bg-indigo-100 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-indigo-50 hover:shadow-sm"}`}
    >
      <Icon className="w-5 h-5" />
      {!collapsed && <span>{label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
          {label}
        </span>
      )}
    </NavLink>
  );
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // 🔹 Estado de usuario y carga
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // 🔹 Traer usuario directamente desde el endpoint
  const fetchUser = async () => {
    try {
      setLoadingUser(true);
      const res = await api.get("usuario-actual/");
      setUser(res.data);
    } catch (err) {
      console.error("❌ Error al cargar usuario:", err.response?.data || err.message);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoadingUser(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const filteredSidebar = useMemo(() => SIDEBAR_ITEMS, []);

  // ================================
  // ⌨️ ATAJOS GLOBALES UI
  // ================================
  useEffect(() => {
    const openSearch = () => {
      console.log("🔎 DashboardLayout → abrir buscador global");
      // luego aquí abrirás el modal real
      // setOpenGlobalSearch(true);
    };

    window.addEventListener("pm:open-search", openSearch);

    return () => {
      window.removeEventListener("pm:open-search", openSearch);
    };
  }, []);

  // ==============
  // BUSCADOR
  // ==============
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    const open = () => setOpenSearch(true);
    const close = () => setOpenSearch(false);

    window.addEventListener("pm:open-search", open);
    window.addEventListener("pm:close-modal", close);

    return () => {
      window.removeEventListener("pm:open-search", open);
      window.removeEventListener("pm:close-modal", close);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] relative font-sans">
      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-all duration-500"
        />
      )}

      {/* SIDEBAR LIGHT ENTERPRISE */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 bg-white flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]!
          ${mobileOpen ? "translate-x-0 w-80" : "-translate-x-full w-80"}
          ${sidebarOpen ? "md:w-80" : "md:w-28"} 
          md:translate-x-0 h-screen border-r border-slate-200 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.03)]`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Toggle Button - Sky/Teal Accent */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`hidden md:flex absolute -right-3 top-10 z-50 bg-[#0d767e] text-white w-6 h-10 items-center justify-center rounded-r-xl shadow-lg shadow-teal-900/20 transition-all duration-300 hover:w-8 ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          {sidebarOpen ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
        </button>

        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* SECCIÓN LOGO: Badge Corporativo */}
          <div className={`relative flex flex-col items-center pt-10 pb-8 transition-all duration-500 ${sidebarOpen ? "px-8" : "px-4"}`}>
            <div className={`
                flex items-center justify-center bg-white rounded-[2.5rem] transition-all duration-500 
                border border-slate-100 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.08)]
                ${sidebarOpen ? "w-full py-7 px-5" : "w-16 h-16 p-2"}
            `}>
              <img
                src={logo}
                alt="Logo V&C"
                className={`transition-all duration-500 object-contain ${sidebarOpen ? "h-16 w-auto" : "h-8 w-8"}`}
              />
            </div>
          </div>

          {/* SECCIÓN USUARIO - LIGHT GLASS */}
          {sidebarOpen && (
            <div className="px-6 mb-6">
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4 flex items-center gap-4 group hover:border-teal-200 transition-all duration-500 shadow-inner">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0d767e] to-[#15aab5] flex items-center justify-center text-white font-black text-lg shadow-md shadow-teal-200">
                    {user?.nomb_cort_usu?.charAt(0) || "U"}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full" />
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-[1000] text-slate-800 uppercase tracking-tight truncate w-32">
                    {loadingUser ? "..." : user?.nomb_cort_usu || user?.usuario_usu}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">En Línea</span>
                </div>
              </div>
            </div>
          )}

          {/* MENÚ DE NAVEGACIÓN */}
          <nav className="flex-1 px-4 py-2 space-y-10 overflow-y-auto no-scrollbar">
            {filteredSidebar.map((section) => (
              <div key={section.section} className="relative">
                {sidebarOpen ? (
                  <div className="flex items-center gap-3 px-4 mb-4">
                    <span className="text-[10px] font-[1000] text-slate-300 uppercase tracking-[0.3em] whitespace-nowrap">
                      {section.section}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-100" />
                  </div>
                ) : (
                  <div className="h-[1px] bg-slate-100 mx-4 mb-8" />
                )}
                
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <SidebarLink
                      key={item.to}
                      {...item}
                      collapsed={!sidebarOpen}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* FOOTER: Logout Card */}
          <div className="p-6 mt-auto">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-4 rounded-[1.5rem] transition-all duration-500 group relative
                ${sidebarOpen 
                  ? "px-5 py-4 w-full bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:border-rose-100" 
                  : "px-0 py-4 w-full justify-center bg-transparent"}`}
            >
              <LogOut className={`transition-all duration-500 ${sidebarOpen ? "w-4 h-4 text-slate-400 group-hover:text-rose-600" : "w-6 h-6 text-slate-400 group-hover:text-rose-600"}`} />
              {sidebarOpen && (
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest group-hover:text-rose-600 transition-colors">
                    Finalizar Sesión
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Security V&C</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header móvil - White Refined */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-100"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-[#0d767e] uppercase tracking-[0.2em]">V&C System</span>
          </div>
          <div className="w-10 h-10 bg-[#0d767e] rounded-xl flex items-center justify-center text-white font-black text-xs">
            {user?.nomb_cort_usu?.charAt(0) || "U"}
          </div>
        </div>

        <main className="flex-1 p-6 md:p-10 bg-[#f8fafc] overflow-y-auto">
          <Outlet />
        </main>
      </div>

      
      <GlobalSearchModal
        open={openSearch}
        onClose={() => setOpenSearch(false)}
      />
    </div>
  
  );
}
