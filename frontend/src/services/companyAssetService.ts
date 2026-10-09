import { fetchApi } from './api';

export interface AssetAssignment {
  id: number;
  asset_id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  assigned_by_id?: number | null;
  assigned_by_name?: string | null;
  assigned_date: string;
  returned_date?: string | null;
  condition_on_assignment: string;
  condition_on_return?: string | null;
  assignment_notes?: string | null;
  return_notes?: string | null;
  is_current: boolean;
}

export interface CompanyAsset {
  id: number;
  asset_code: string;
  name: string;
  category: 'TECNOLOGIA' | 'MOBILIARIO' | 'EQUIPOS_OFICINA' | 'VEHICULOS' | 'HERRAMIENTAS' | 'OTROS';
  serial_number?: string | null;
  brand?: string | null;
  model?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  purchase_date?: string | null;
  purchase_cost: number;
  warranty_expiration?: string | null;
  status: 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'DAMAGED' | 'DECOMMISSIONED';
  current_condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  location?: string | null;
  current_holder_id?: number | null;
  current_holder_name?: string | null;
  current_holder_email?: string | null;
  photo_url?: string | null;
  invoice_reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  assignments: AssetAssignment[];
}

export interface AssetStats {
  total_assets: number;
  available_assets: number;
  assigned_assets: number;
  maintenance_assets: number;
  damaged_assets: number;
  decommissioned_assets: number;
  total_asset_value: number;
}

export interface AssetListResponse {
  items: CompanyAsset[];
  total: number;
}

export interface CreateAssetPayload {
  asset_code?: string;
  name: string;
  category: string;
  serial_number?: string;
  brand?: string;
  model?: string;
  supplier_id?: number;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiration?: string;
  status?: string;
  current_condition?: string;
  location?: string;
  photo_url?: string;
  invoice_reference?: string;
  notes?: string;
  initial_holder_id?: number;
}

export interface UpdateAssetPayload extends Partial<CreateAssetPayload> {}

export interface AssignAssetPayload {
  user_id: number;
  condition_on_assignment: string;
  assignment_notes?: string;
}

export interface ReturnAssetPayload {
  condition_on_return: string;
  return_notes?: string;
  new_status?: string;
}

export const companyAssetService = {
  getStats: async (): Promise<AssetStats> => {
    return await fetchApi('/assets/stats');
  },

  getAssets: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    condition?: string;
    holder_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<AssetListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category && params.category !== 'ALL') searchParams.append('category', params.category);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.condition && params.condition !== 'ALL') searchParams.append('condition', params.condition);
    if (params?.holder_id) searchParams.append('holder_id', String(params.holder_id));
    if (params?.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi(`/assets${queryString}`);
  },

  getAsset: async (id: number): Promise<CompanyAsset> => {
    return await fetchApi(`/assets/${id}`);
  },

  createAsset: async (data: CreateAssetPayload): Promise<CompanyAsset> => {
    return await fetchApi('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAsset: async (id: number, data: UpdateAssetPayload): Promise<CompanyAsset> => {
    return await fetchApi(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  assignAsset: async (id: number, data: AssignAssetPayload): Promise<CompanyAsset> => {
    return await fetchApi(`/assets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  returnAsset: async (id: number, data: ReturnAssetPayload): Promise<CompanyAsset> => {
    return await fetchApi(`/assets/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteAsset: async (id: number): Promise<{ message: string }> => {
    return await fetchApi(`/assets/${id}`, {
      method: 'DELETE',
    });
  },
};
