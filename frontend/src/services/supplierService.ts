import { fetchApi } from './api';

export interface Supplier {
  id: number;
  name: string;
  nit_rut?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  category: string;
  payment_terms: string;
  bank_info?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  total_purchase_orders?: number;
  total_spent?: number;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
}

export interface CreateSupplierPayload {
  name: string;
  nit_rut?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  category: string;
  payment_terms: string;
  bank_info?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {}

export const supplierService = {
  getSuppliers: async (params?: {
    search?: string;
    category?: string;
    active_only?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<SupplierListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category && params.category !== 'ALL') searchParams.append('category', params.category);
    if (params?.active_only !== undefined) searchParams.append('active_only', String(params.active_only));
    if (params?.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi(`/suppliers${queryString}`);
  },

  getSupplier: async (id: number): Promise<Supplier> => {
    return await fetchApi(`/suppliers/${id}`);
  },

  createSupplier: async (data: CreateSupplierPayload): Promise<Supplier> => {
    return await fetchApi('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSupplier: async (id: number, data: UpdateSupplierPayload): Promise<Supplier> => {
    return await fetchApi(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSupplier: async (id: number): Promise<{ message: string }> => {
    return await fetchApi(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  },
};
