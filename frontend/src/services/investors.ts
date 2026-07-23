import { fetchApi } from './api';
import { User } from './users';
import { Package } from './packages';
import { Period } from './periods';

export interface ContractHistory {
  id: number;
  investor_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  total_contrato: number;
  tasa_interes: string;
  rentabilidad_contrato: number;
  rendimiento_total_pagado: number;
  motivo: string;
  observaciones?: string;
  created_at?: string;
}

export interface Acceleration {
  id: number;
  investor_id: number;
  investment_request_id: number;
  contract_period_id?: number;
  original_days: number;
  acceleration_percentage: number;
  days_to_reduce: number;
  capital_released?: number;
  new_duration: number;
  applied: boolean;
  bonus_amount: number;
  created_at?: string;
}

export interface Withdrawal {
  id: number;
  investor_id?: number;
  user_id: number;
  origen: string;
  tipo: string;
  monto: number;
  impuesto: number;
  monto_neto: number;
  fecha_solicitud: string;
  fecha_retiro?: string;
  estado: string;
  metodo_pago?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
}

export interface Investor {
  id: number;
  assigned_code: string;
  referred_by?: string;
  user_id: number;
  package_id: number;
  period_id: number;
  start_date: string;
  end_date: string;
  observations?: string;
  created_at: string;
  updated_at?: string;
  
  user?: User;
  package?: Package;
  period?: Period;
  contract_histories?: ContractHistory[];
  accelerations?: Acceleration[];
  withdrawals?: Withdrawal[];
  total_acceleration_bonus?: number;
  daily_yield_amount?: number;
  daily_capital_amount?: number;
  has_capital_withdrawal?: boolean;
  total_capital_withdrawn?: number;
}

export const getInvestors = async (params?: { page?: number; limit?: number; search?: string; has_history?: boolean }): Promise<{ data: Investor[]; total: number }> => {
  const queryParams = new URLSearchParams();
  if (params) {
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.has_history !== undefined) queryParams.append('has_history', params.has_history.toString());
  }
  const queryString = queryParams.toString();
  return await fetchApi(`/investors/${queryString ? `?${queryString}` : ''}`);
};

export const createInvestor = async (data: Partial<Investor>) => {
  return await fetchApi('/investors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateInvestor = async (id: number, data: Partial<Investor>) => {
  return await fetchApi(`/investors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteInvestor = async (id: number) => {
  return await fetchApi(`/investors/${id}`, {
    method: 'DELETE',
  });
};

export const bulkUploadInvestors = async (file: File): Promise<{ success: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/investors/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};
