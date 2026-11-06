import { useQuery } from '@tanstack/react-query';
import { sarlaftService, SarlaftCheckResponse } from '../services/sarlaft';
import { useAuthStore } from '../store/authStore';

export interface SarlaftStatusState {
    isLoading: boolean;
    data: SarlaftCheckResponse | undefined;
    sarlaftCheck: SarlaftCheckResponse['check'] | undefined;
    isPending: boolean;
    isRejected: boolean;
    isApproved: boolean;
    canInvest: boolean;
    statusText: string;
    riskLevel: string;
    refetch: () => void;
}

export const useSarlaftStatus = (): SarlaftStatusState => {
    const { user } = useAuthStore();

    const { data, isLoading, refetch } = useQuery<SarlaftCheckResponse>({
        queryKey: ['my_sarlaft_check'],
        queryFn: () => sarlaftService.getMyCheck(),
        enabled: !!user,
        staleTime: 1000 * 15,
        refetchInterval: (query) => {
            const check = query.state.data?.check;
            const rawStatus = (check?.status || check?.tusdatos_status || query.state.data?.status || 'none').toLowerCase();
            const isPending = rawStatus === 'none' || rawStatus === 'pending' || rawStatus === 'processing' || rawStatus === 'procesando';
            // Pollear cada 5s mientras esté pendiente para desbloquear automáticamente al terminar
            return isPending ? 5000 : false;
        }
    });

    const sarlaftCheck = data?.check;
    const rawStatus = (sarlaftCheck?.status || sarlaftCheck?.tusdatos_status || data?.status || 'none').toLowerCase();

    // Si no hay verificación o está en proceso -> Pendiente
    const isPending = rawStatus === 'none' || rawStatus === 'pending' || rawStatus === 'processing' || rawStatus === 'procesando';

    // Si falló o fue clasificado de alto riesgo sin corregir -> Rechazado
    const isRejected = !isPending && (
        rawStatus === 'failed' || rawStatus === 'error' || (
            sarlaftCheck?.risk_level === 'HIGH' && !sarlaftCheck?.tusdatos_hallazgos_corregidos
        )
    );

    const isApproved = !isPending && !isRejected && (
        rawStatus === 'completed' || rawStatus === 'finalizado'
    );

    const canInvest = isApproved;

    let statusText = 'Verificación pendiente';
    if (isApproved) statusText = 'Verificación aprobada';
    else if (isRejected) statusText = 'Verificación con alertas / rechazada';

    return {
        isLoading,
        data,
        sarlaftCheck,
        isPending,
        isRejected,
        isApproved,
        canInvest,
        statusText,
        riskLevel: sarlaftCheck?.risk_level || 'NONE',
        refetch
    };
};
