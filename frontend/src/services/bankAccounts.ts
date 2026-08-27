import { fetchApi } from './api';

export interface DataBank {
  id: number;
  banck: string;
  code_banck: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserBankAccount {
  id: number;
  user_id: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  is_active: boolean;
  created_at?: string;
}

export const bankAccountsService = {
  getBanks: async (search?: string): Promise<DataBank[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await fetchApi(`/banks${query}`);
  },

  getMyBankAccounts: async (): Promise<UserBankAccount[]> => {
    return await fetchApi('/bank-accounts/me');
  },

  sendOtpCode: async (): Promise<{ message: string }> => {
    return await fetchApi('/bank-accounts/send-otp', {
      method: 'POST',
    });
  },

  createBankAccount: async (data: {
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    code: string;
  }): Promise<{ message: string; id: number }> => {
    return await fetchApi('/bank-accounts/me', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  updateBankAccount: async (
    id: number,
    data: {
      banco?: string;
      tipo_cuenta?: string;
      numero_cuenta?: string;
      code: string;
    }
  ): Promise<{ message: string }> => {
    return await fetchApi(`/bank-accounts/me/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  deleteBankAccount: async (
    id: number,
    code: string
  ): Promise<{ message: string }> => {
    return await fetchApi(`/bank-accounts/me/${id}/delete`, {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
