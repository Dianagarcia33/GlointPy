import { fetchApi } from './api';
import { User } from './users';

export interface AuditUser extends User {
    investments?: any[];
    wallet?: any;
}

export const auditService = {
    getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        
        const queryString = queryParams.toString();
        const url = `/audit/users${queryString ? `?${queryString}` : ''}`;
        
        return await fetchApi(url);
    }
};

export interface YieldSegment {
  start_date: string;
  end_date: string;
  days: number;
  active_capital: number;
  daily_yield: number;
  segment_yield: number;
  note: string;
}

export interface YieldCalculationResult {
  investment_id: number;
  requested_start_date: string;
  requested_end_date: string;
  effective_start_date: string | null;
  effective_end_date: string | null;
  total_days: number;
  total_yield: number;
  acceleration_bonus?: number;
  segments: YieldSegment[];
}

export interface UserYieldCalculationResult {
  user_id: number;
  requested_start_date: string;
  requested_end_date: string;
  total_yield: number;
  total_acceleration_bonus?: number;
  grand_total?: number;
  investments_yields: YieldCalculationResult[];
}

export interface CalculateYieldPayload {
  start_date: string;
  end_date: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  amount: number;
  type: 'ingreso' | 'egreso';
  reference_type: string;
  reference_id?: number;
  description?: string;
  balance_after: number;
  created_at: string;
}

export interface BulkYieldUserSummary {
  user_id: number;
  user_name: string;
  email: string;
  document_id?: string;
  has_wallet: boolean;
  investments_count: number;
  total_yield: number;
  total_acceleration_bonus: number;
  grand_total: number;
  investments_detail?: YieldCalculationResult[];
}

export interface BulkYieldCalculationResult {
  requested_start_date: string;
  requested_end_date: string;
  total_users_evaluated: number;
  total_payable_users: number;
  global_yield_total: number;
  global_acceleration_bonus_total: number;
  global_grand_total: number;
  users_summaries: BulkYieldUserSummary[];
}

export interface BulkPayYieldResult {
  message: string;
  requested_start_date: string;
  requested_end_date: string;
  total_users_paid: number;
  global_yield_total: number;
  global_acceleration_bonus_total: number;
  global_grand_total: number;
}

Object.assign(auditService, {
  calculateYield: async (investmentId: number, payload: CalculateYieldPayload): Promise<YieldCalculationResult> => {
    return await fetchApi(`/audit/investments/${investmentId}/calculate-yield`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  
  payYield: async (investmentId: number, payload: CalculateYieldPayload): Promise<{ message: string, amount_paid: number }> => {
    return await fetchApi(`/audit/investments/${investmentId}/pay-yield`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  
  calculateUserYields: async (userId: number, payload: CalculateYieldPayload): Promise<UserYieldCalculationResult> => {
    return await fetchApi(`/audit/users/${userId}/calculate-yields`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  
  payUserYields: async (userId: number, payload: CalculateYieldPayload): Promise<{ message: string, amount_paid: number }> => {
    return await fetchApi(`/audit/users/${userId}/pay-yields`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  
  getWalletTransactions: async (userId: number): Promise<WalletTransaction[]> => {
    return await fetchApi(`/audit/users/${userId}/wallet-transactions`);
  },
  
  createWallet: async (userId: number): Promise<{ message: string }> => {
    return await fetchApi(`/audit/users/${userId}/create-wallet`, {
      method: 'POST'
    });
  },

  bulkCalculateYields: async (payload: CalculateYieldPayload): Promise<BulkYieldCalculationResult> => {
    return await fetchApi('/audit/bulk-calculate-yields', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  bulkPayYields: async (payload: CalculateYieldPayload): Promise<BulkPayYieldResult> => {
    return await fetchApi('/audit/bulk-pay-yields', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
});

