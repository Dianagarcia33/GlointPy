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
  }
};
