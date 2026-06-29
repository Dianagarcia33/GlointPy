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
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  paquete: PaqueteInversion;
}

export const investmentsService = {
  getMyInvestments: async (): Promise<Investment[]> => {
    return await fetchApi('/investments/me');
  },
};
