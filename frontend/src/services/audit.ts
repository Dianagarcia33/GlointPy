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
  segments: YieldSegment[];
}

export interface UserYieldCalculationResult {
  user_id: number;
  requested_start_date: string;
  requested_end_date: string;
  total_yield: number;
  investments_yields: YieldCalculationResult[];
}

export interface CalculateYieldPayload {
  start_date: string;
  end_date: string;
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
  }
});
