import { fetchApi } from '../../../../services/api';
import { PaginatedWithdrawals, Withdrawal } from '../types';

export const paymentService = {
  getWithdrawals: async (page = 1, limit = 20, search = '', status = 'todos', startDate = '', endDate = ''): Promise<PaginatedWithdrawals> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (status && status !== 'todos') params.append('status', status);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const data = await fetchApi(`/withdrawals/?${params.toString()}`);
    return data as PaginatedWithdrawals;
  },

  approveWithdrawal: async (id: number, receiptFile?: File): Promise<Withdrawal> => {
    let body = undefined;
    let headers = undefined;

    if (receiptFile) {
      const formData = new FormData();
      formData.append('file', receiptFile);
      body = formData;
      // Do not set Content-Type header when using FormData so fetch can set the boundary automatically
      // But fetchApi might set application/json by default, we need to handle that.
    }

    const data = await fetchApi(`/withdrawals/${id}/approve`, {
      method: 'POST',
      body,
    });
    return data as Withdrawal;
  },

  rejectWithdrawal: async (id: number, reason: string): Promise<Withdrawal> => {
    const data = await fetchApi(`/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo: reason }),
    });
    return data as Withdrawal;
  },

  syncWalletDebits: async (): Promise<{ synced_count: number; message: string }> => {
    const data = await fetchApi('/withdrawals/sync-wallet-debits', {
      method: 'POST',
    });
    return data as { synced_count: number; message: string };
  },

  bulkProcessWithdrawals: async (withdrawalIds: number[]): Promise<{ processed_count: number; message: string }> => {
    const data = await fetchApi('/withdrawals/bulk-process', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_ids: withdrawalIds }),
      headers: { 'Content-Type': 'application/json' },
    });
    return data as { processed_count: number; message: string };
  },

  bulkApproveWithdrawals: async (withdrawalIds: number[]): Promise<{ approved_count: number; message: string }> => {
    const data = await fetchApi('/withdrawals/bulk-approve', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_ids: withdrawalIds }),
      headers: { 'Content-Type': 'application/json' },
    });
    return data as { approved_count: number; message: string };
  }
};

