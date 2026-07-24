import { fetchApi } from './api';

export interface CommercialClientCheckResponse {
  client_document: string;
  client_exists: boolean;
  is_existing_client: boolean;
  client_name?: string;
  monto?: number;
  allowed_types: string[];
  forced_type?: string;
}

export interface CommercialSale {
  id: number;
  commercial_id: number;
  commercial_name?: string;
  client_document: string;
  client_name?: string;
  sale_type: 'contrato_nuevo' | 'reinversion' | 'referido';
  referrer_code?: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  tramo_a_amount?: number;
  tramo_b_amount?: number;
  status: 'pendiente' | 'liquidado';
  settlement_id?: number;
  sale_date: string;
  created_at?: string;
}

export interface CommissionSettlement {
  id: number;
  commercial_id: number;
  commercial_name?: string;
  settled_by_id?: number;
  settled_by_name?: string;
  total_amount: number;
  sales_count: number;
  reference_code?: string;
  notes?: string;
  created_at: string;
}

export interface PendingSettlementBreakdown {
  commercial_id: number;
  sales_count: number;
  sales_commission_total: number;
  daily_bonuses_total: number;
  floor_bonuses_total: number;
  welfare_bonuses_total: number;
  total_amount: number;
  bonuses: Array<{
    id: number;
    bonus_type: string;
    amount: number;
    details?: string;
    earned_date: string;
  }>;
}

export interface CommercialBonusSummaryItem {
  commercial_id: number;
  commercial_name: string;
  email: string;
  today_closures: number;
  monthly_volume: number;
  pending_bonuses_count: number;
  pending_bonuses_total: number;
  bonuses: Array<{
    id: number;
    bonus_type: string;
    amount: number;
    status: string;
    details?: string;
    earned_date: string;
  }>;
}

export interface CommercialSummary {
  direct_accumulated: number;
  referral_accumulated: number;
  total_accumulated: number;
  total_commissions: number;
  threshold_36m: number;
  remaining_for_36m: number;
  has_reached_36m: boolean;
  current_rate: number;
  recent_sales: CommercialSale[];
}

export interface AdminCommercialSummary {
  global_sales: number;
  global_commissions: number;
  total_closures: number;
  leader_name: string;
}

export interface SearchClientResult {
  user_id: number;
  name: string;
  document_id: string;
  email: string;
  assigned_code?: string;
  monto?: number;
  is_existing_client: boolean;
  forced_type?: string;
}

export interface LeaderboardEntry {
  rank: number;
  commercial_id: number;
  commercial_name: string;
  total_volume: number;
  total_closures: number;
  next_target_amount: number;
  is_me: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  my_rank?: LeaderboardEntry;
}

export interface CommercialUserOption {
  id: number;
  name: string;
  email: string;
  document_id?: string;
}

export const commercialService = {
  searchClients: async (q: string): Promise<SearchClientResult[]> => {
    return await fetchApi(`/commercial/search-clients?q=${encodeURIComponent(q)}`);
  },

  checkClient: async (client_document: string): Promise<CommercialClientCheckResponse> => {
    return await fetchApi('/commercial/check-client', {
      method: 'POST',
      body: JSON.stringify({ client_document }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  createSale: async (data: {
    client_document: string;
    client_name?: string;
    sale_type: 'contrato_nuevo' | 'reinversion' | 'referido';
    amount: number;
    referrer_code?: string;
  }): Promise<CommercialSale> => {
    return await fetchApi('/commercial/sales', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  createAdminSale: async (
    targetCommercialId: number,
    data: {
      client_document: string;
      client_name?: string;
      sale_type: 'contrato_nuevo' | 'reinversion' | 'referido';
      amount: number;
      referrer_code?: string;
    }
  ): Promise<CommercialSale> => {
    return await fetchApi(`/commercial/admin-sales?target_commercial_id=${targetCommercialId}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getMySummary: async (): Promise<CommercialSummary> => {
    return await fetchApi('/commercial/my-summary');
  },

  getAdminSummary: async (): Promise<AdminCommercialSummary> => {
    return await fetchApi('/commercial/admin-summary');
  },

  getAllSales: async (params?: { commercial_id?: number; sale_type?: string }): Promise<CommercialSale[]> => {
    const query = new URLSearchParams();
    if (params?.commercial_id) query.append('commercial_id', params.commercial_id.toString());
    if (params?.sale_type) query.append('sale_type', params.sale_type);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await fetchApi(`/commercial/all-sales${queryString}`);
  },

  deleteSale: async (saleId: number): Promise<void> => {
    return await fetchApi(`/commercial/sales/${saleId}`, { method: 'DELETE' });
  },

  getCommercialUsers: async (): Promise<CommercialUserOption[]> => {
    return await fetchApi('/commercial/commercial-users');
  },

  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    return await fetchApi('/commercial/leaderboard');
  },

  getPendingSettlementBreakdown: async (commercialId: number): Promise<PendingSettlementBreakdown> => {
    return await fetchApi(`/commercial/pending-settlement/${commercialId}`);
  },

  getBonusesSummary: async (): Promise<CommercialBonusSummaryItem[]> => {
    return await fetchApi('/commercial/bonuses-summary');
  },

  settleCommissions: async (data: {
    commercial_id: number;
    reference_code?: string;
    notes?: string;
  }): Promise<any> => {
    return await fetchApi('/commercial/settle', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getSettlements: async (commercial_id?: number): Promise<CommissionSettlement[]> => {
    const query = commercial_id ? `?commercial_id=${commercial_id}` : '';
    return await fetchApi(`/commercial/settlements${query}`);
  },
};
