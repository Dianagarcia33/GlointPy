import { fetchApi } from './api';

export interface CommercialClientCheckResponse {
  client_document: string;
  client_exists: boolean;
  is_existing_client: boolean;
  client_name?: string;
  allowed_types: string[];
  forced_type?: string;
}

export interface CommercialSale {
  id: number;
  commercial_id: number;
  client_document: string;
  client_name?: string;
  sale_type: 'contrato_nuevo' | 'reinversion' | 'referido';
  referrer_code?: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  tramo_a_amount?: number;
  tramo_b_amount?: number;
  sale_date: string;
  created_at?: string;
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

export const commercialService = {
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

  getMySummary: async (): Promise<CommercialSummary> => {
    return await fetchApi('/commercial/my-summary');
  },

  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    return await fetchApi('/commercial/leaderboard');
  },
};
