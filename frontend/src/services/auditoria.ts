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

export interface RespaldoInvestment {
    user_id: string | number;
    user_name: string;
    user_email: string;
    inversiones: InversionDetail[];
}

export const auditoriaService = {
    getRespaldoInvestments: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/respaldo');
    }
};
