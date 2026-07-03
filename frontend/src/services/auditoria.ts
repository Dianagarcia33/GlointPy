import { fetchApi } from './api';

export interface RespaldoInvestment {
    id: number;
    user_id: number;
    user_nombre?: string;
    user_apellido?: string;
    correo_electronico?: string;
    paquete_inversion_id: number;
    monto: number;
    status: string;
    created_at?: string;
    [key: string]: any;
}

export const auditoriaService = {
    getRespaldoInvestments: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/respaldo');
    }
};
