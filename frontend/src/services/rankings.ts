import { fetchApi } from './api';

export interface InvestmentRank {
  id: number;
  name: string;
  slug: string;
  min_investment: number;
  max_investment?: number | null;
  bonus_percentage: number;
  color: string;
  icon: string;
  priority_withdrawal: boolean;
  benefits: string[];
  order: number;
  is_active: boolean;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserRankDetails {
  user_id: number;
  user_name: string;
  total_active_capital: number;
  active_contracts_count: number;
  current_rank: InvestmentRank | null;
  next_rank: InvestmentRank | null;
  progress_percentage: number;
  amount_needed: number;
  all_ranks: InvestmentRank[];
}

export interface RankCreateInput {
  name: string;
  slug?: string;
  min_investment: number;
  max_investment?: number | null;
  bonus_percentage: number;
  color: string;
  icon: string;
  priority_withdrawal: boolean;
  benefits: string[];
  order: number;
  is_active: boolean;
}

export interface RankUpdateInput {
  name?: string;
  slug?: string;
  min_investment?: number;
  max_investment?: number | null;
  bonus_percentage?: number;
  color?: string;
  icon?: string;
  priority_withdrawal?: boolean;
  benefits?: string[];
  order?: number;
  is_active?: boolean;
}

export const rankingsService = {
  getRankings: async (onlyActive?: boolean): Promise<InvestmentRank[]> => {
    const qs = onlyActive ? '?only_active=true' : '';
    return await fetchApi(`/rankings${qs}`);
  },

  getMyRankDetails: async (): Promise<UserRankDetails> => {
    return await fetchApi('/rankings/me');
  },

  getUserRankDetails: async (userId: number): Promise<UserRankDetails> => {
    return await fetchApi(`/rankings/user/${userId}`);
  },

  createRank: async (data: RankCreateInput): Promise<InvestmentRank> => {
    return await fetchApi('/rankings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRank: async (id: number, data: RankUpdateInput): Promise<InvestmentRank> => {
    return await fetchApi(`/rankings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteRank: async (id: number): Promise<{ message: string }> => {
    return await fetchApi(`/rankings/${id}`, {
      method: 'DELETE',
    });
  },

  seedDefaultRanks: async (): Promise<InvestmentRank[]> => {
    return await fetchApi('/rankings/seed-defaults', {
      method: 'POST',
    });
  },

  syncAllRanks: async (): Promise<{ status: string; message: string; total_users_synced: number; distribution: Record<string, number> }> => {
    return await fetchApi('/rankings/sync-all', {
      method: 'POST',
    });
  },

  assignRankToUser: async (userId: number, rankId: number | null): Promise<UserRankDetails> => {
    return await fetchApi('/rankings/assign-user', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, rank_id: rankId }),
    });
  },
};
