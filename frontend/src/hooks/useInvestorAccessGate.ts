import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from './usePermissions';
import { useSarlaftStatus } from './useSarlaftStatus';
import { investmentsService, Investment } from '../services/investments';

/** Pantalla a la que se envía al inversionista mientras su verificación no esté aprobada. */
export const INVESTOR_ONBOARDING_PATH = '/dashboard/primera-inversion';

/** Únicas pantallas del panel que puede abrir un inversionista sin verificación aprobada. */
const RESTRICTED_ALLOWED_PATHS = [INVESTOR_ONBOARDING_PATH, '/dashboard/tickets'];

export const isAllowedWhileRestricted = (pathname: string): boolean => {
    const clean = pathname.replace(/\/+$/, '');
    return RESTRICTED_ALLOWED_PATHS.some((p) => clean === p || clean.startsWith(`${p}/`));
};

/** Permisos que solo tiene el personal interno: quien tenga alguno nunca queda restringido. */
const INTERNAL_PERMISSIONS = [
    'commercial:view',
    'crm:view',
    'director:dashboard:view',
    'accounting:dashboard:view',
    'dashboard:view_director',
    'dashboard:view_accounting',
    'dashboard:view_admin_360',
];

export type InvestorAccessStatus = 'open' | 'loading' | 'restricted';

/**
 * Acceso al panel de un inversionista según su verificación de identidad (SARLAFT).
 *
 * - open:       personal interno, inversionista aprobado o inversionista que ya tiene inversiones o solicitudes.
 * - restricted: inversionista sin ninguna inversión cuya verificación no está aprobada (pendiente, en revisión
 *               o rechazada). No ve el menú ni puede abrir módulos; solo la pantalla de bienvenida y soporte.
 * - loading:    todavía no se sabe; mientras tanto no se le muestra el menú ni el contenido de los módulos.
 */
export const useInvestorAccessGate = (): { status: InvestorAccessStatus; isRestricted: boolean; isLoading: boolean } => {
    const user = useAuthStore((state) => state.user);
    const { hasPermission, hasAnyPermission, isAdmin } = usePermissions();

    const isInternal =
        !user ||
        isAdmin() ||
        hasAnyPermission(INTERNAL_PERMISSIONS) ||
        (user.permissions || []).some((p) => /^admin[.:]/i.test(p));
    const isInvestorCandidate = !isInternal && hasPermission('wallets:new_investment');

    const { isApproved, isLoading: loadingSarlaft } = useSarlaftStatus({ enabled: isInvestorCandidate });

    const { data: investments, isLoading: loadingInvestments } = useQuery<Investment[]>({
        queryKey: ['my_investments', user?.id],
        queryFn: async () => {
            const d = await investmentsService.getMyInvestments();
            return Array.isArray(d) ? d : [];
        },
        enabled: isInvestorCandidate && !!user?.id,
        staleTime: 30000,
    });

    let status: InvestorAccessStatus = 'open';
    if (isInvestorCandidate) {
        if (loadingSarlaft) status = 'loading';
        else if (isApproved) status = 'open';
        else if (loadingInvestments) status = 'loading';
        else status = (investments?.length ?? 0) > 0 ? 'open' : 'restricted';
    }

    return { status, isRestricted: status === 'restricted', isLoading: status === 'loading' };
};
