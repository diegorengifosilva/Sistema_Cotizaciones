// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "@/styles/Home.css";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

import { AuthProvider } from "@/context/AuthContext.jsx";
import ProtectedRoute from "@/components/layout/ProtectedRoute.jsx";

// AUTH
import LoginPage from "@/auth/login/LoginPage.jsx";
import RegisterPage from "@/auth/register/RegisterPage.jsx";

// LAYOUT PRINCIPAL
import DashboardLayout from "@/dashboard/layout/DashboardLayout.jsx";

// DASHBOARDS DE PRUEBA PARA COTIZACIONES
import Cotizaciones from "./dashboard/cotizaciones/Cotizaciones";
import RevisionCotizaciones from "./dashboard/revision_cotizaciones/RevisionCotizaciones";
import AprobacionCotizacion from "@/dashboard/aprobacion_cotizacion/AprobacionCotizacion.jsx";
import SeguimientoCotizaciones from "@/dashboard/seguimiento_cotizaciones/SeguimientoCotizaciones.jsx";
import CotizacionesHome from "./dashboard/Home/CotizacionesHome";

// MODAL NUEVA COTIZACIÓN
import CotizacionNuevaModal from "./dashboard/aprobacion_cotizacion/CotizacionNuevaModal";

import { KeyboardProvider } from "@/context/KeyboardContext.jsx";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <KeyboardProvider>

          <ToastContainer position="top-right" autoClose={3000} />

          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Home */}
              <Route path="cotizaciones-home" element={<CotizacionesHome />} />

              {/* Cotizaciones */}
              <Route path="cotizaciones" element={<Cotizaciones />} />

              {/* Revisión */}
              <Route
                path="revision-cotizacion"
                element={<RevisionCotizaciones />}
              />

              {/* Aprobación */}
              <Route
                path="aprobacion-cotizacion"
                element={<AprobacionCotizacion />}
              />

              {/* Seguimiento */}
              <Route
                path="seguimiento-cotizaciones"
                element={<SeguimientoCotizaciones />}
              />

              {/* Nueva Cotización */}
              <Route
                path="cotizaciones/nueva"
                element={<CotizacionNuevaModal />}
              />
            </Route>

            {/* Redirect */}
            <Route
              path="/"
              element={<Navigate to="/dashboard/cotizaciones" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard/cotizaciones" replace />}
            />
          </Routes>

        </KeyboardProvider>
      </AuthProvider>
    </Router>
  );
}
