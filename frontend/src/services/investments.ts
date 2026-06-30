import { fetchApi } from './api';

export interface PaqueteInversion {
  id: number;
  paquete_accion_adquirido: string;
  acciones_otorgadas: number;
}

export interface Investment {
  id: number;
  user_id: number;
  monto: number;
  status: 'pending' | 'approved' | 'rejected' | 'finished';
  created_at: string;
  
  // Rendimientos y Totales (para el Dashboard Avanzado)
  total_contrato?: number;
  rendimiento_total_contrato?: number;
  liquidacion_diaria_rendimiento?: number;
  dias_contrato?: number;

  paquete: PaqueteInversion;
}

export const investmentsService = {
  getMyInvestments: async (): Promise<Investment[]> => {
    return await fetchApi('/investments/me');
  },
};
