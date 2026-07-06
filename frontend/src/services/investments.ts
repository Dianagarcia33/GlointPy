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

export interface PersonalInfo {
  nombre_completo?: string;
  correo_electronico?: string;
  tipo_documento?: string;
  documento?: string;
  numero_celular?: string;
  ciudad?: string;
  fecha_nacimiento?: string;
  referido_por?: string;
  observaciones?: string;
}

export interface BankAccountInfo {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
}

export interface LegalRepInfo {
  nombre?: string;
  documento?: string;
  email?: string;
  telefono?: string;
}

export interface FinancialInfo {
  paquete_nombre?: string;
  paquete_inversion_adquirido?: number;
  total_contrato?: number;
  rendimiento_total_contrato?: number;
  liquidacion_diaria_capital?: number;
  liquidacion_diaria_rendimiento?: number;
  rendimiento_aprobado_mensual?: number;
  rentabilidad_contrato?: number;
  acciones_otorgadas?: number;
  valor_total_acciones?: number;
  porcentaje_participacion_accionista?: number;
  periodo_porcentaje?: number;
  periodo_meses?: number;
  periodo_dias?: number;
  dias_contrato?: number;
  dias_generando?: number;
  rendimiento_diario_calculado?: number;
  rendimiento_producido_hasta_ayer?: number;
  capital_actual?: number;
  capital_devuelto?: number;
  saldo_a_migrar?: number;
  wallet_balance_actual?: number;
}

export interface KycInfo {
  status?: string;
  job_id?: string;
  report_id?: string;
  hallazgos?: string;
  msg?: string;
  sources?: string;
  justificacion?: string;
  evidencia_paths?: string;
  hallazgos_corregidos?: boolean | number;
  fecha_correccion?: string;
  corregido_por?: number;
  last_check?: string;
}

export interface AdminInvestment {
  id: number;
  user_id: number;
  codigo_asignado?: string;
  estado?: string;
  fecha_ingreso?: string;
  fecha_finalizacion?: string;
  created_at?: string;
  updated_at?: string;

  personal_info: PersonalInfo;
  bank_account: BankAccountInfo;
  legal_rep: LegalRepInfo;
  financial_info: FinancialInfo;
  kyc_info: KycInfo;

  total_bonos?: number;
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
    origen: string;
    is_reinversion?: boolean;
    observaciones?: string;
  }[];
  tramos_desglose?: {
    fecha_inicio: string;
    fecha_fin: string;
    dias: number;
    capital_base: number;
    rendimiento_diario: number;
    producido: number;
  }[];
}

export interface AdminInvestmentRequest {
  id: number;
  user_id: number;
  monto: number;
  status: string;
  comprobante_path?: string;
  created_at: string;
  usuario_nombre?: string;
  usuario_correo?: string;
  paquete_nombre?: string;
}

export const investmentsService = {
  getMyInvestments: async (): Promise<Investment[]> => {
    return await fetchApi('/investments/me');
  },
  getAllInvestments: async (): Promise<AdminInvestment[]> => {
    return await fetchApi('/investments/admin/all');
  },
  getAllInvestmentRequests: async (): Promise<AdminInvestmentRequest[]> => {
    return await fetchApi('/investments/admin/requests');
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
  },

  searchUser: async (query: string): Promise<any[]> => {
    return await fetchApi(`/investments/admin/search-user?query=${encodeURIComponent(query)}`);
  },

  getPaquetes: async (): Promise<any[]> => {
    return await fetchApi('/investments/admin/paquetes');
  },

  getContractPeriods: async (): Promise<any[]> => {
    return await fetchApi('/contract-periods');
  },

  createInvestmentForClient: async (data: any) => {
    return await fetchApi('/investments/admin/create-for-client', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateInvestment: async (id: number, data: any) => {
    return await fetchApi(`/investments/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};
