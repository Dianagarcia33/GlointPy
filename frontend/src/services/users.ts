import { fetchApi } from './api';
import { Role } from './roles';

export interface BankAccount {
  id: number;
  user_id: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  is_active: boolean;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  currency: string;
  status: 'active' | 'frozen';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  document_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  roles: Role[];
  bank_accounts?: BankAccount[];
  wallet?: Wallet | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  total: number;
  page: number;
  limit: number;
  data: User[];
}

export interface UserCreate {
  name: string;
  email: string;
  document_id?: string;
  phone_number?: string;
  date_of_birth?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserUpdate {
  name?: string;
  email?: string;
  document_id?: string;
  phone_number?: string;
  date_of_birth?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserStatementSummary {
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  closing_balance: number;
  total_withdrawn_paid: number;
  total_withdrawn_pending: number;
  total_capital_invested: number;
}

export interface UserStatementTransaction {
  id: number;
  created_at: string;
  type: string;
  description: string;
  amount: number;
  is_credit: boolean;
  balance_after: number;
}

export interface UserStatementWithdrawal {
  id: number;
  created_at: string;
  fecha_solicitud: string;
  fecha_aprobacion?: string | null;
  tipo: string;
  monto_bruto: number;
  retencion: number;
  monto_neto: number;
  estado: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  metodo_pago: string;
}

export interface UserStatementInvestment {
  id: number;
  assigned_code: string;
  capital: number;
  porcentaje_mensual: number;
  meses: number;
  fecha_inicio: string;
  estado: string;
  observaciones: string;
}

export interface UserAccountStatement {
  statement_date: string;
  period: {
    start_date: string;
    end_date: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
    document_id: string;
    phone_number: string;
    date_of_birth?: string | null;
    roles: string[];
  };
  bank_accounts: BankAccount[];
  wallet: {
    id?: number | null;
    balance: number;
    currency: string;
    status: string;
  };
  summary: UserStatementSummary;
  transactions: UserStatementTransaction[];
  withdrawals: UserStatementWithdrawal[];
  investments: UserStatementInvestment[];
}

export const usersService = {
  getUsers: async (params?: { page?: number, limit?: number, search?: string, role_id?: number, is_active?: boolean, has_wallet?: boolean }): Promise<PaginatedUsers> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.page !== undefined) queryParams.append('page', params.page.toString());
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.role_id !== undefined) queryParams.append('role_id', params.role_id.toString());
      if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
      if (params.has_wallet !== undefined) queryParams.append('has_wallet', params.has_wallet.toString());
    }
    const queryString = queryParams.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;
    return await fetchApi(url);
  },

  createUser: async (data: UserCreate): Promise<User> => {
    return await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (id: number, data: UserUpdate): Promise<User> => {
    return await fetchApi(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadBulkUsers: async (file: File): Promise<{ success: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    return await fetchApi('/users/bulk-upload', {
      method: 'POST',
      body: formData,
    });
  },

  resetPassword: async (id: number): Promise<{ message: string; user_id: number }> => {
    return await fetchApi(`/users/${id}/reset-password`, {
      method: 'POST',
    });
  },

  createWallet: async (userId: number): Promise<{ message: string; wallet_id: number; user_id: number }> => {
    return await fetchApi(`/users/${userId}/create-wallet`, {
      method: 'POST',
    });
  },

  getUserStatement: async (userId: number, startDate?: string, endDate?: string): Promise<UserAccountStatement> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return await fetchApi(`/users/${userId}/statement${qs ? `?${qs}` : ''}`);
  },
};
