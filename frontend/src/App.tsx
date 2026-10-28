import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingLayout } from "./features/landing_v2/components/LandingLayout";
import { MaintenancePage } from "./features/maintenance/components/MaintenancePage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useVersionChecker } from "./hooks/useVersionChecker";
import { useAuthStore } from "./store/authStore";
import { RequirePermission } from "./components/security/RequirePermission";
import { fetchApi } from "./services/api";
import { useGlobalNotifications } from "./hooks/useGlobalNotifications";
import { PageLoader } from "./components/layout/PageLoader";

// Las páginas se cargan en diferido: el navegador solo descarga el código de cada sección cuando se visita
const lazyPage = <K extends string>(factory: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  React.lazy(() => factory().then((m) => ({ default: m[name] })));

const LandingHome = lazyPage(() => import("./features/landing_v2/pages/LandingHome"), "LandingHome");
const NosotrosPage = lazyPage(() => import("./features/landing_v2/pages/NosotrosPage"), "NosotrosPage");
const InvestmentPage = lazyPage(() => import("./features/landing_v2/pages/InvestmentPage"), "InvestmentPage");
const PlacePage = lazyPage(() => import("./features/landing_v2/pages/PlacePage"), "PlacePage");
const TechPage = lazyPage(() => import("./features/landing_v2/pages/TechPage"), "TechPage");
const ContactoPage = lazyPage(() => import("./features/landing_v2/pages/ContactoPage"), "ContactoPage");
const EventRegistrationPage = lazyPage(() => import("./features/landing_v2/pages/EventRegistrationPage"), "EventRegistrationPage");
const LoginPage = lazyPage(() => import("./features/auth/pages/LoginPage"), "LoginPage");
const RegisterPage = lazyPage(() => import("./features/auth/pages/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyPage(() => import("./features/auth/pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(() => import("./features/auth/pages/ResetPasswordPage"), "ResetPasswordPage");
const WelcomeOnboardingPage = lazyPage(() => import("./features/auth/pages/WelcomeOnboardingPage"), "WelcomeOnboardingPage");
const ForceChangePasswordPage = lazyPage(() => import("./features/auth/pages/ForceChangePasswordPage"), "ForceChangePasswordPage");
const TermsAndConditionsPage = lazyPage(() => import("./features/landing/pages/TermsAndConditionsPage"), "TermsAndConditionsPage");
const PrivacyPolicyPage = lazyPage(() => import("./features/landing/pages/PrivacyPolicyPage"), "PrivacyPolicyPage");
const LegalNoticePage = lazyPage(() => import("./features/landing/pages/LegalNoticePage"), "LegalNoticePage");
const DashboardPage = lazyPage(() => import("./features/dashboard/pages/DashboardPage"), "DashboardPage");
const WalletsPage = lazyPage(() => import("./features/wallets/pages/WalletsPage"), "WalletsPage");
const InvestmentDetailPage = lazyPage(() => import("./features/investments/pages/InvestmentDetailPage"), "InvestmentDetailPage");
const AdminInvestmentsPage = lazyPage(() => import("./features/admin/investments/pages/AdminInvestmentsPage"), "AdminInvestmentsPage");
const AdminRolesPage = lazyPage(() => import("./features/admin/roles/pages/AdminRolesPage"), "AdminRolesPage");
const AdminUsersPage = lazyPage(() => import("./features/admin/users/pages/AdminUsersPage"), "AdminUsersPage");
const AdminPeriodsPage = lazyPage(() => import("./features/admin/periods/pages/AdminPeriodsPage"), "AdminPeriodsPage");
const AdminPackagesPage = lazyPage(() => import("./features/admin/packages/pages/AdminPackagesPage"), "AdminPackagesPage");
const AdminInvestorsPage = lazyPage(() => import("./features/admin/investors/pages/AdminInvestorsPage"), "AdminInvestorsPage");
const AdminTemplatesPage = lazyPage(() => import("./features/admin/templates/pages/AdminTemplatesPage"), "AdminTemplatesPage");
const AdminRankingsPage = lazyPage(() => import("./features/admin/rankings/pages/AdminRankingsPage"), "AdminRankingsPage");
const AdminExternalAppsPage = lazyPage(() => import("./features/admin/external-apps/pages/AdminExternalAppsPage"), "AdminExternalAppsPage");
const GlointPayCheckoutPage = lazyPage(() => import("./features/checkout/pages/GlointPayCheckoutPage"), "GlointPayCheckoutPage");
const PaymentManagementPage = lazyPage(() => import("./features/admin/payments/pages/PaymentManagementPage"), "PaymentManagementPage");
const SystemEventsPage = lazyPage(() => import("./features/admin/pages/SystemEventsPage"), "SystemEventsPage");
const SecurityLogsPage = lazyPage(() => import("./features/admin/pages/SecurityLogsPage"), "SecurityLogsPage");
const BankAccountsVaultPage = lazyPage(() => import("./features/bank_accounts/pages/BankAccountsVaultPage"), "BankAccountsVaultPage");
const CommercialDashboardPage = lazyPage(() => import("./features/commercial/pages/CommercialDashboardPage"), "CommercialDashboardPage");
const BeneficiariesPage = lazyPage(() => import("./features/beneficiaries/pages/BeneficiariesPage"), "BeneficiariesPage");
const ReferralsPage = lazyPage(() => import("./features/referrals/pages/ReferralsPage"), "ReferralsPage");
const SharesMarketPage = lazyPage(() => import("./features/shares/pages/SharesMarketPage"), "SharesMarketPage");
const AdminSharesPage = lazyPage(() => import("./features/admin/shares/pages/AdminSharesPage"), "AdminSharesPage");
const AdminReferralsPage = lazyPage(() => import("./features/admin/referrals/pages/AdminReferralsPage"), "AdminReferralsPage");
const ChatPage = lazyPage(() => import("./features/chat/pages/ChatPage"), "ChatPage");
const CRMPage = lazyPage(() => import("./features/crm/pages/CRMPage"), "CRMPage");
const CRMInboxPage = lazyPage(() => import("./features/crm/pages/CRMInboxPage"), "CRMInboxPage");
const CRMCalendarPage = lazyPage(() => import("./features/crm/pages/CRMCalendarPage"), "CRMCalendarPage");
const AdminNotificationsPage = lazyPage(() => import("./features/admin/notifications/pages/AdminNotificationsPage"), "AdminNotificationsPage");
const AdminEventsPage = lazyPage(() => import("./features/admin/events/pages/AdminEventsPage"), "AdminEventsPage");
const TicketsPage = lazyPage(() => import("./features/tickets/pages/TicketsPage"), "TicketsPage");
const ProfilePage = lazyPage(() => import("./features/profile/pages/ProfilePage"), "ProfilePage");
const RoomsPage = lazyPage(() => import("./features/rooms/pages/RoomsPage"), "RoomsPage");
const InventoryPage = lazyPage(() => import("./features/inventory/pages/InventoryPage"), "InventoryPage");
const SuppliersPage = lazyPage(() => import("./features/suppliers/pages/SuppliersPage"), "SuppliersPage");
const PurchaseOrdersPage = lazyPage(() => import("./features/purchase_orders/pages/PurchaseOrdersPage"), "PurchaseOrdersPage");
const AssetsPage = lazyPage(() => import("./features/assets/pages/AssetsPage"), "AssetsPage");
const CreditsPage = lazyPage(() => import("./features/credits/pages/CreditsPage"), "CreditsPage");
const AdminCreditsPage = lazyPage(() => import("./features/admin/credits/pages/AdminCreditsPage"), "AdminCreditsPage");
const DailyYieldsPage = lazyPage(() => import("./features/admin/daily_yields/pages/DailyYieldsPage"), "DailyYieldsPage");
const TechnicalAssessmentPage = lazyPage(() => import("./features/technical_assessment/pages/TechnicalAssessmentPage"), "TechnicalAssessmentPage");
const AdminTechnicalEvaluationsPage = lazyPage(() => import("./features/technical_assessment/pages/AdminTechnicalEvaluationsPage"), "AdminTechnicalEvaluationsPage");


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

  const { isAuthenticated, setUser, logout } = useAuthStore();

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

  // Lógica de mantenimiento comentada
  // const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  // if (isMaintenanceMode) return <MaintenancePage />;

  return (
    <React.Suspense fallback={<PageLoader />}>
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
      
      {/* Alias de compatibilidad con rutas documentadas en especificación */}
      <Route path="/chat" element={<Navigate to="/dashboard/chat" replace />} />
      <Route path="/rooms" element={<Navigate to="/dashboard/rooms" replace />} />

      {/* Pasarela Pública Gloint Pay Checkout */}
      <Route path="/pay/checkout" element={<GlointPayCheckoutPage />} />
      
      {/* Rutas Públicas de Evaluación Técnica para Candidatos (Cero Login / Protegidas por PIN) */}
      <Route path="/evaluacion-tecnica" element={<TechnicalAssessmentPage />} />
      <Route path="/evaluaciones-tecnicas" element={<TechnicalAssessmentPage />} />
      <Route path="/prueba-tecnica" element={<TechnicalAssessmentPage />} />
      <Route path="/pruebas-tecnicas" element={<TechnicalAssessmentPage />} />
      
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
        <Route path="investments" element={<Navigate to="/dashboard" replace />} />
        <Route path="investments/:id" element={<RequirePermission permissions={["dashboard:view_investments", "wallets:view", "admin.investors.manage", "director.dashboard.view"]}><InvestmentDetailPage /></RequirePermission>} />
        <Route path="audit" element={<RequirePermission permission="admin.audits.manage"><AdminInvestmentsPage /></RequirePermission>} />
        <Route path="daily-yields" element={<RequirePermission permissions={["admin.audits.manage", "admin.investors.manage"]}><DailyYieldsPage /></RequirePermission>} />
        <Route path="security-logs" element={<RequirePermission permissions={["admin.audits.manage", "admin.roles.manage"]}><SecurityLogsPage /></RequirePermission>} />
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
        <Route path="inventory" element={<RequirePermission permissions={["inventory:view", "inventory.view"]}><InventoryPage /></RequirePermission>} />
        <Route path="suppliers" element={<RequirePermission permissions={["suppliers:view", "suppliers.view", "inventory:view"]}><SuppliersPage /></RequirePermission>} />
        <Route path="purchase-orders" element={<RequirePermission permissions={["purchase_orders:view", "purchase_orders.view", "inventory:view"]}><PurchaseOrdersPage /></RequirePermission>} />
        <Route path="assets" element={<RequirePermission permissions={["assets:view", "assets.view", "inventory:view"]}><AssetsPage /></RequirePermission>} />
        <Route path="credits" element={<RequirePermission permissions={["credits:view", "credits:request", "dashboard:view_investments", "wallets:view"]}><CreditsPage /></RequirePermission>} />
        <Route path="admin-credits" element={<RequirePermission permissions={["admin.credits.manage", "credits:manage"]}><AdminCreditsPage /></RequirePermission>} />
        <Route path="evaluaciones-tecnicas" element={<RequirePermission permission="admin.users.manage"><AdminTechnicalEvaluationsPage /></RequirePermission>} />
        <Route path="pruebas-tecnicas" element={<RequirePermission permission="admin.users.manage"><AdminTechnicalEvaluationsPage /></RequirePermission>} />
        {/* Alias de compatibilidad documentados en Módulos 12 y 13 */}
        <Route path="admin/investors" element={<Navigate to="/dashboard/investors" replace />} />
        <Route path="admin/rankings" element={<Navigate to="/dashboard/rankings" replace />} />
        <Route path="admin/credits" element={<Navigate to="/dashboard/admin-credits" replace />} />
      </Route>


      {/* Redirección por defecto si la ruta no existe */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
  );
}

export default App;
