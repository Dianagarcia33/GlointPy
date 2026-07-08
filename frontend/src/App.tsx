import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingLayout } from "./features/landing_v2/components/LandingLayout";
import { LandingHome } from "./features/landing_v2/pages/LandingHome";
import { NosotrosPage } from "./features/landing_v2/pages/NosotrosPage";
import { InvestmentPage } from "./features/landing_v2/pages/InvestmentPage";
import { PlacePage } from "./features/landing_v2/pages/PlacePage";
import { TechPage } from "./features/landing_v2/pages/TechPage";
import { ContactoPage } from "./features/landing_v2/pages/ContactoPage";
import { MaintenancePage } from "./features/maintenance/components/MaintenancePage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { WelcomeOnboardingPage } from "./features/auth/pages/WelcomeOnboardingPage";
import { TermsAndConditionsPage } from "./features/landing/pages/TermsAndConditionsPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { WalletsPage } from "./features/wallets/pages/WalletsPage";
import { InvestmentsPage } from "./features/investments/pages/InvestmentsPage";
import { AdminInvestmentsPage } from "./features/admin/investments/pages/AdminInvestmentsPage";
import { AdminRolesPage } from "./features/admin/roles/pages/AdminRolesPage";
import { AdminUsersPage } from "./features/admin/users/pages/AdminUsersPage";
import { AdminPeriodsPage } from "./features/admin/periods/pages/AdminPeriodsPage";
import { SystemEventsPage } from "./features/admin/pages/SystemEventsPage";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { useAuthStore } from "./store/authStore";
import { RequirePermission } from "./components/security/RequirePermission";

// Componente para proteger rutas (si no está logueado, lo manda al login)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Componente para rutas de invitados (si YA está logueado, lo manda al dashboard)
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  // Inicializamos el "Perro Guardián" de inactividad
  useInactivityTimer();

  // Lógica de mantenimiento comentada
  // const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  // if (isMaintenanceMode) return <MaintenancePage />;

  return (
    <Routes>
      <Route element={<GuestRoute><LandingLayout /></GuestRoute>}>
        <Route path="/" element={<LandingHome />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/investment" element={<InvestmentPage />} />
        <Route path="/place" element={<PlacePage />} />
        <Route path="/tech" element={<TechPage />} />
        <Route path="/contacto" element={<ContactoPage />} />
      </Route>
      <Route path="/terminos" element={<TermsAndConditionsPage />} />
      <Route path="/onboarding" element={<GuestRoute><WelcomeOnboardingPage /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      
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
        <Route path="wallet" element={<WalletsPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="investments/reales" element={<AdminInvestmentsPage />} />
        <Route path="roles" element={<RequirePermission permission="admin.roles.manage"><AdminRolesPage /></RequirePermission>} />
        <Route path="users" element={<RequirePermission permission="admin.users.manage"><AdminUsersPage /></RequirePermission>} />
        <Route path="periods" element={<RequirePermission permission="admin.periods.manage"><AdminPeriodsPage /></RequirePermission>} />
        <Route path="system-events" element={<SystemEventsPage />} />
      </Route>

      {/* Redirección por defecto si la ruta no existe */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
