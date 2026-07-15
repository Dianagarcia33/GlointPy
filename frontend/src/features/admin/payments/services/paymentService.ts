import { fetchApi } from '../../../../services/api';
import { PaginatedWithdrawals } from '../types';

export const paymentService = {
  getWithdrawals: async (page = 1, limit = 20, search = ''): Promise<PaginatedWithdrawals> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const data = await fetchApi(`/withdrawals/?${params.toString()}`);
    return data as PaginatedWithdrawals;
  },

  approveWithdrawal: async (id: number): Promise<Withdrawal> => {
    const data = await fetchApi(`/withdrawals/${id}/approve`, {
      method: 'POST',
    });
    return data as Withdrawal;
  },

  rejectWithdrawal: async (id: number, reason: string): Promise<Withdrawal> => {
    const data = await fetchApi(`/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo: reason }),
    });
    return data as Withdrawal;
  }
};
