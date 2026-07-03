import { fetchApi } from './api';

export interface InversionDetail {
    id: number;
    codigo_asignado: string;
    monto: number;
    nombre_paquete: string;
    nombre_periodo: string;
    meses_periodo: number;
    dias_periodo: number;
    estado: string;
    created_at: string;
    fecha_ingreso?: string;
    fecha_finalizacion?: string;
}

export interface RetiroDetail {
    id: number;
    monto: number;
    monto_neto: number;
    estado: string;
    fecha_solicitud: string;
    tipo: string;
}

export interface RequestDetail {
    id: number;
    monto: number;
    status: string;
    created_at: string;
}

export interface AccelerationDetail {
    id: number;
    original_days: number;
    acceleration_percentage: number;
    days_to_reduce: number;
    new_duration: number;
    applied: number;
    created_at: string;
}

export interface HistoryDetail {
    id: number;
    fecha_inicio: string;
    fecha_fin: string;
    dias_contrato: number;
    total_contrato: number;
    tasa_interes: string;
    acciones_otorgadas: number;
    rentabilidad_contrato: number;
    rendimiento_total_generado: number;
}

export interface RespaldoInvestment {
    user_id: string | number;
    user_name: string;
    user_email: string;
    inversiones: InversionDetail[];
    retiros: RetiroDetail[];
    requests: RequestDetail[];
    accelerations: AccelerationDetail[];
    histories: HistoryDetail[];
}

export const auditoriaService = {
    getRespaldoInvestments: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/respaldo');
    }
};
