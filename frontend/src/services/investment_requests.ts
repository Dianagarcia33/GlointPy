import { fetchApi } from './api';

export interface InvestmentRequest {
  id: number;
  user_id: number;
  paquete_inversion_id: number;
  monto: number;
  status: string;
  investor_id?: number;
  prospecto_id?: number;
  comprobante_path?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  extra_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  user?: any;
  package?: any;
  investor?: any;
}

export interface PaginatedInvestmentRequests {
  data: InvestmentRequest[];
  total: number;
}

export const getInvestmentRequests = async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedInvestmentRequests> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);

  const qs = query.toString();
  return fetchApi(`/investment-requests/${qs ? `?${qs}` : ''}`);
};

export const bulkUploadInvestmentRequests = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetchApi('/investment-requests/bulk-upload', {
    method: 'POST',
    body: formData,
  });
  
  return response;
};

export const approveInvestmentRequest = async (id: number) => {
  return await fetchApi(`/investment-requests/${id}/approve`, {
    method: 'POST',
  });
};

export const rejectInvestmentRequest = async (id: number, reason: string) => {
  return await fetchApi(`/investment-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason: reason })
  });
};
