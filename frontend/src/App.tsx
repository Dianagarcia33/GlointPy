import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingLayout } from "./features/landing_v2/components/LandingLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";

import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useVersionChecker } from "./hooks/useVersionChecker";
import { useAuthStore } from "./store/authStore";
import { RequirePermission } from "./components/security/RequirePermission";
import { fetchApi } from "./services/api";
import { useGlobalNotifications } from "./hooks/useGlobalNotifications";

// --- Lazy-loaded Landing Pages ---
const LandingHome = lazy(() => import("./features/landing_v2/pages/LandingHome").then(m => ({ default: m.LandingHome })));
const NosotrosPage = lazy(() => import("./features/landing_v2/pages/NosotrosPage").then(m => ({ default: m.NosotrosPage })));
const InvestmentPage = lazy(() => import("./features/landing_v2/pages/InvestmentPage").then(m => ({ default: m.InvestmentPage })));
const PlacePage = lazy(() => import("./features/landing_v2/pages/PlacePage").then(m => ({ default: m.PlacePage })));
const TechPage = lazy(() => import("./features/landing_v2/pages/TechPage").then(m => ({ default: m.TechPage })));
const ContactoPage = lazy(() => import("./features/landing_v2/pages/ContactoPage").then(m => ({ default: m.ContactoPage })));
const EventRegistrationPage = lazy(() => import("./features/landing_v2/pages/EventRegistrationPage").then(m => ({ default: m.EventRegistrationPage })));
const TermsAndConditionsPage = lazy(() => import("./features/landing/pages/TermsAndConditionsPage").then(m => ({ default: m.TermsAndConditionsPage })));
const PrivacyPolicyPage = lazy(() => import("./features/landing/pages/PrivacyPolicyPage").then(m => ({ default: m.PrivacyPolicyPage })));
const LegalNoticePage = lazy(() => import("./features/landing/pages/LegalNoticePage").then(m => ({ default: m.LegalNoticePage })));

// --- Lazy-loaded Auth Pages ---
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("./features/auth/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./features/auth/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const WelcomeOnboardingPage = lazy(() => import("./features/auth/pages/WelcomeOnboardingPage").then(m => ({ default: m.WelcomeOnboardingPage })));
const ForceChangePasswordPage = lazy(() => import("./features/auth/pages/ForceChangePasswordPage").then(m => ({ default: m.ForceChangePasswordPage })));
const GlointPayCheckoutPage = lazy(() => import("./features/checkout/pages/GlointPayCheckoutPage").then(m => ({ default: m.GlointPayCheckoutPage })));

// --- Lazy-loaded Dashboard & Commercial Pages ---
const DashboardPage = lazy(() => import("./features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import("./features/profile/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const WalletsPage = lazy(() => import("./features/wallets/pages/WalletsPage").then(m => ({ default: m.WalletsPage })));
const InvestmentsPage = lazy(() => import("./features/investments/pages/InvestmentsPage").then(m => ({ default: m.InvestmentsPage })));
const InvestmentDetailPage = lazy(() => import("./features/investments/pages/InvestmentDetailPage").then(m => ({ default: m.InvestmentDetailPage })));
const BankAccountsVaultPage = lazy(() => import("./features/bank_accounts/pages/BankAccountsVaultPage").then(m => ({ default: m.BankAccountsVaultPage })));
const CommercialDashboardPage = lazy(() => import("./features/commercial/pages/CommercialDashboardPage").then(m => ({ default: m.CommercialDashboardPage })));
const BeneficiariesPage = lazy(() => import("./features/beneficiaries/pages/BeneficiariesPage").then(m => ({ default: m.BeneficiariesPage })));
const ReferralsPage = lazy(() => import("./features/referrals/pages/ReferralsPage").then(m => ({ default: m.ReferralsPage })));
const SharesMarketPage = lazy(() => import("./features/shares/pages/SharesMarketPage").then(m => ({ default: m.SharesMarketPage })));
const TicketsPage = lazy(() => import("./features/tickets/pages/TicketsPage").then(m => ({ default: m.TicketsPage })));
const ChatPage = lazy(() => import("./features/chat/pages/ChatPage").then(m => ({ default: m.ChatPage })));
const CRMPage = lazy(() => import("./features/crm/pages/CRMPage").then(m => ({ default: m.CRMPage })));
const CRMInboxPage = lazy(() => import("./features/crm/pages/CRMInboxPage").then(m => ({ default: m.CRMInboxPage })));
const CRMCalendarPage = lazy(() => import("./features/crm/pages/CRMCalendarPage").then(m => ({ default: m.CRMCalendarPage })));
const RoomsPage = lazy(() => import("./features/rooms/pages/RoomsPage").then(m => ({ default: m.RoomsPage })));

// --- Lazy-loaded Admin Pages ---
const AdminInvestmentsPage = lazy(() => import("./features/admin/investments/pages/AdminInvestmentsPage").then(m => ({ default: m.AdminInvestmentsPage })));
const AdminRolesPage = lazy(() => import("./features/admin/roles/pages/AdminRolesPage").then(m => ({ default: m.AdminRolesPage })));
const AdminUsersPage = lazy(() => import("./features/admin/users/pages/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminPeriodsPage = lazy(() => import("./features/admin/periods/pages/AdminPeriodsPage").then(m => ({ default: m.AdminPeriodsPage })));
const AdminPackagesPage = lazy(() => import("./features/admin/packages/pages/AdminPackagesPage").then(m => ({ default: m.AdminPackagesPage })));
const AdminInvestorsPage = lazy(() => import("./features/admin/investors/pages/AdminInvestorsPage").then(m => ({ default: m.AdminInvestorsPage })));
const AdminTemplatesPage = lazy(() => import("./features/admin/templates/pages/AdminTemplatesPage").then(m => ({ default: m.AdminTemplatesPage })));
const AdminRankingsPage = lazy(() => import("./features/admin/rankings/pages/AdminRankingsPage").then(m => ({ default: m.AdminRankingsPage })));
const AdminExternalAppsPage = lazy(() => import("./features/admin/external-apps/pages/AdminExternalAppsPage").then(m => ({ default: m.AdminExternalAppsPage })));
const PaymentManagementPage = lazy(() => import("./features/admin/payments/pages/PaymentManagementPage").then(m => ({ default: m.PaymentManagementPage })));
const SystemEventsPage = lazy(() => import("./features/admin/pages/SystemEventsPage").then(m => ({ default: m.SystemEventsPage })));
const AdminSharesPage = lazy(() => import("./features/admin/shares/pages/AdminSharesPage").then(m => ({ default: m.AdminSharesPage })));
const AdminReferralsPage = lazy(() => import("./features/admin/referrals/pages/AdminReferralsPage").then(m => ({ default: m.AdminReferralsPage })));
const AdminNotificationsPage = lazy(() => import("./features/admin/notifications/pages/AdminNotificationsPage").then(m => ({ default: m.AdminNotificationsPage })));
const AdminEventsPage = lazy(() => import("./features/admin/events/pages/AdminEventsPage").then(m => ({ default: m.AdminEventsPage })));


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
  // Inicializamos el "Perro Guardián" de inactividad, registro Push y detector de versiones
  useInactivityTimer();
  usePushNotifications();
  useVersionChecker();
  
  // Inicializamos el listener global de notificaciones en tiempo real
  useGlobalNotifications();

  const { isAuthenticated, setUser } = useAuthStore();

  // Al cargar la app, se hidrata o refresca el perfil y permisos en memoria desde el servidor
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchApi('/auth/me')
        .then((userData) => {
          if (userData) {
            setUser(userData);
          }
        })
        .catch((err) => {
          // Si el token es inválido o expiró (401), fetchApi ejecuta logout() automáticamente.
          // Si es un fallo temporal de red o 500, mantenemos la sesión persistida.
          console.warn('Error al verificar sesión en /auth/me:', err);
        });
    }
  }, [isAuthenticated]);

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<GuestRoute><LandingLayout /></GuestRoute>}>
          <Route path="/" element={<LandingHome />} />
          <Route path="/about" element={<NosotrosPage />} />
          <Route path="/investment" element={<InvestmentPage />} />
          <Route path="/place" element={<PlacePage />} />
          <Route path="/tech" element={<TechPage />} />
          <Route path="/contact" element={<ContactoPage />} />
        </Route>

        {/* Rutas Directas al Evento Gloint Power Tech */}
        <Route element={<LandingLayout />}>
          <Route path="/gloint-power-tech" element={<EventRegistrationPage />} />
          <Route path="/power-tech" element={<EventRegistrationPage />} />
          <Route path="/evento" element={<EventRegistrationPage />} />
          <Route path="/registro-evento" element={<EventRegistrationPage />} />
        </Route>
        <Route path="/terminos" element={<TermsAndConditionsPage />} />
        <Route path="/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/legal" element={<LegalNoticePage />} />
        <Route path="/onboarding" element={<GuestRoute><WelcomeOnboardingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        <Route path="/force-change-password" element={<GuestRoute><ForceChangePasswordPage /></GuestRoute>} />
        
        {/* Pasarela Pública Gloint Pay Checkout */}
        <Route path="/pay/checkout" element={<GlointPayCheckoutPage />} />
        
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wallet" element={<RequirePermission permission="wallets:view"><WalletsPage /></RequirePermission>} />
          <Route path="investments" element={<RequirePermission permissions={["dashboard:view_investments", "wallets:view", "admin.investors.manage", "director.dashboard.view"]}><InvestmentsPage /></RequirePermission>} />
          <Route path="investments/:id" element={<RequirePermission permissions={["dashboard:view_investments", "wallets:view", "admin.investors.manage", "director.dashboard.view"]}><InvestmentDetailPage /></RequirePermission>} />
          <Route path="audit" element={<RequirePermission permission="admin.audits.manage"><AdminInvestmentsPage /></RequirePermission>} />
          <Route path="roles" element={<RequirePermission permission="admin.roles.manage"><AdminRolesPage /></RequirePermission>} />
          <Route path="users" element={<RequirePermission permission="admin.users.manage"><AdminUsersPage /></RequirePermission>} />
          <Route path="periods" element={<RequirePermission permission="admin.periods.manage"><AdminPeriodsPage /></RequirePermission>} />
          <Route path="packages" element={<RequirePermission permission="admin.packages.manage"><AdminPackagesPage /></RequirePermission>} />
          <Route path="investors" element={<RequirePermission permission="admin.investors.manage"><AdminInvestorsPage /></RequirePermission>} />
          <Route path="payments" element={<RequirePermission permission="admin.payments.manage"><PaymentManagementPage /></RequirePermission>} />
          <Route path="external-apps" element={<RequirePermission permissions={["admin.external_apps.manage", "admin.roles.manage"]}><AdminExternalAppsPage /></RequirePermission>} />
          <Route path="system-events" element={<RequirePermission permission="manage_system_events"><SystemEventsPage /></RequirePermission>} />
          <Route path="bank-accounts" element={<RequirePermission permission="bank_accounts:manage"><BankAccountsVaultPage /></RequirePermission>} />
          <Route path="commercial" element={<RequirePermission permission="commercial:view"><CommercialDashboardPage /></RequirePermission>} />
          <Route path="templates" element={<RequirePermission permission="admin.roles.manage"><AdminTemplatesPage /></RequirePermission>} />
          {/* Mercado de Acciones */}
          <Route path="shares-market" element={<RequirePermission permissions={["admin.shares.manage", "admin.roles.manage", "wallets:view", "dashboard:view_investments"]}><SharesMarketPage /></RequirePermission>} />
          <Route path="admin-shares" element={<RequirePermission permissions={["admin.shares.manage", "admin.roles.manage"]}><AdminSharesPage /></RequirePermission>} />
          <Route path="beneficiaries" element={<RequirePermission permission="beneficiaries:view"><BeneficiariesPage /></RequirePermission>} />
          <Route path="referrals" element={<RequirePermission permission="referrals:view"><ReferralsPage /></RequirePermission>} />
          <Route path="admin-referrals" element={<RequirePermission permissions={["admin.referrals.manage", "admin.roles.manage"]}><AdminReferralsPage /></RequirePermission>} />
          <Route path="rankings" element={<RequirePermission permissions={["admin.rankings.manage", "admin.roles.manage"]}><AdminRankingsPage /></RequirePermission>} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="chat" element={<RequirePermission permission="chat:view"><ChatPage /></RequirePermission>} />
          <Route path="crm" element={<RequirePermission permission="crm:view"><CRMPage /></RequirePermission>} />
          <Route path="crm/inbox" element={<RequirePermission permissions={["crm:inbox:view", "crm:view"]}><CRMInboxPage /></RequirePermission>} />
          <Route path="crm/calendar" element={<RequirePermission permissions={["crm:calendar:view", "crm:view"]}><CRMCalendarPage /></RequirePermission>} />
          <Route path="admin-notifications" element={<RequirePermission permissions={["admin.notifications.manage", "admin.roles.manage"]}><AdminNotificationsPage /></RequirePermission>} />
          <Route path="events" element={<RequirePermission permissions={["admin.events.manage", "admin.roles.manage"]}><AdminEventsPage /></RequirePermission>} />
          <Route path="rooms" element={<RequirePermission permissions={["rooms:view", "rooms:reserve", "admin.rooms.manage"]}><RoomsPage /></RequirePermission>} />
        </Route>

        {/* Redirección por defecto si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

