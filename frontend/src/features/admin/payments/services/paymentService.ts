import api from '../../../../services/api';
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

    const response = await api.get(`/withdrawals/?${params.toString()}`);
    return response.data;
  }
};
