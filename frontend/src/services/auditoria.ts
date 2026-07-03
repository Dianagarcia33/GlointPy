import { fetchApi } from './api';

export interface RespaldoInvestment {
    id: number;
    nombre?: string;
    apellido?: string;
    correo_electronico?: string;
    total_contrato?: number;
    estado?: string;
    created_at?: string;
    [key: string]: any;
}

export const auditoriaService = {
    getRespaldoInvestments: async (): Promise<RespaldoInvestment[]> => {
        return fetchApi('/auditoria/respaldo');
    }
};
