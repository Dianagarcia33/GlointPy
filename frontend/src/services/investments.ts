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
  tipo_documento?: string;
  documento?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
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
  total_bonos?: number;
  wallet_balance_actual?: number;
  capital_devuelto?: number;
  detalles_bonos?: {
    id: number;
    monto: number;
    dias_reducidos: number;
    fecha: string;
  }[];
  total_retiros_rendimiento?: number;
  detalles_retiros_rendimiento?: {
    id: number;
    fecha: string;
    monto: number;
    is_reinversion?: boolean;
  }[];
  saldo_a_migrar?: number;
    tramos_desglose?: {
    fecha_inicio: string;
    fecha_fin: string;
    dias: number;
    capital_base: number;
    rendimiento_diario: number;
    producido: number;
  }[];
  referido_por?: string;
  numero_celular?: string;
  ciudad?: string;
  estado?: string;
  acciones_otorgadas?: number;
  rendimiento_aprobado_mensual?: number;
  rentabilidad_contrato?: number;
  liquidacion_diaria_capital?: number;
  valor_total_acciones?: number;
  porcentaje_participacion_accionista?: number;
  tusdatos_job_id?: string;
  tusdatos_status?: string;
  tusdatos_report_id?: string;
  tusdatos_hallazgos?: string;
  tusdatos_msg?: string;
  tusdatos_sources?: string;
  tusdatos_justificacion?: string;
  tusdatos_evidencia_paths?: string;
  tusdatos_hallazgos_corregidos?: boolean | number;
  tusdatos_fecha_correccion?: string;
  tusdatos_corregido_por?: number;
  tusdatos_last_check?: string;
  fecha_nacimiento?: string;
  dias_contrato?: number;
  paquete_inversion_adquirido?: number | string;
  observaciones?: string;
  representante_legal_nombre?: string;
  representante_legal_documento?: string;
  representante_legal_email?: string;
  representante_legal_telefono?: string;
  created_at?: string;
  updated_at?: string;
}

export const investmentsService = {
  getMyInvestments: async (): Promise<Investment[]> => {
    return await fetchApi('/investments/me');
  },
  getAllInvestments: async (): Promise<AdminInvestment[]> => {
    return await fetchApi('/investments/admin/all');
  },

  nivelarWallet: async (userId: number, saldoAuditado: number) => {
    return await fetchApi(`/investments/admin/nivelar-wallet/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ saldo_auditado: saldoAuditado })
    });
  },

  nivelarWalletsMasivo: async (usuarios: { user_id: number, saldo_auditado: number }[]) => {
    return await fetchApi(`/investments/admin/nivelar-wallets-masivo`, {
      method: 'POST',
      body: JSON.stringify({ usuarios })
    });
  },

  fixMissingRetiros: async () => {
    return await fetchApi('/investments/admin/fix-missing-retiros', { method: 'POST' });
  }
};
