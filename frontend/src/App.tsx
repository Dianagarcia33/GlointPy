import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from "./features/landing/components/LandingPage";
import { MaintenancePage } from "./features/maintenance/components/MaintenancePage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { useAuthStore } from "./store/authStore";

// Componente para proteger rutas (si no está logueado, lo manda al login)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  // Inicializamos el "Perro Guardián" de inactividad
  useInactivityTimer();

  // Lógica de mantenimiento
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  if (isMaintenanceMode) return <MaintenancePage />;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Rutas protegidas que usan el DashboardLayout (Navbar + Sidebar) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<DashboardPage />} />
        {/* Aquí agregaremos más rutas en el futuro, ej. <Route path="retiros" element={<RetirosPage />} /> */}
      </Route>

      {/* Redirección por defecto si la ruta no existe */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
