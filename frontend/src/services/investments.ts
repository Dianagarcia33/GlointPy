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
  fecha_ingreso?: string;
  fecha_finalizacion?: string;
  aceleracion_dias?: number;

  paquete: PaqueteInversion;
}

export interface AdminInvestment {
  id: number;
  user_id: number;
  nombre_completo?: string;
  correo_electronico?: string;
  codigo_asignado?: string;
  paquete_nombre?: string;
  fecha_ingreso?: string;
  fecha_finalizacion?: string;
  total_contrato?: number;
  rendimiento_total_contrato?: number;
  liquidacion_diaria_rendimiento?: number;
  periodo_porcentaje?: number;
  periodo_meses?: number;
  periodo_dias?: number;
  rendimiento_diario_calculado?: number;
  dias_generando?: number;
  rendimiento_producido_hasta_ayer?: number;
  capital_actual?: number;
}

export const investmentsService = {
  getMyInvestments: async (): Promise<Investment[]> => {
    return await fetchApi('/investments/me');
  },
  getAllInvestments: async (): Promise<AdminInvestment[]> => {
    return await fetchApi('/investments/admin/all');
  }
};
