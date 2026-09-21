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

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  document_id?: string | null;
  date_of_birth?: string | null;
  parent_user_id?: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  document_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  must_update_profile?: boolean;
  is_active: boolean;
  is_superuser: boolean;
  parent_user_id?: number | null;
  parent?: UserSummary | null;
  children?: UserSummary[];
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
  parent_user_id?: number | null;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserUpdate {
  name?: string;
  email?: string;
  document_id?: string;
  phone_number?: string;
  date_of_birth?: string;
  parent_user_id?: number | null;
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
  total_shares?: number;
  total_shares_value?: number;
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

export interface UserStatementShareMovement {
  id: number;
  created_at: string;
  movement_type: string;
  type_label: string;
  shares_quantity: number;
  balance_before: number;
  balance_after: number;
  description: string;
  investor_id?: number | null;
  package_id?: number | null;
}

export interface UserStatementShares {
  total_shares_owned: number;
  available_shares: number;
  locked_shares: number;
  current_share_price: number;
  portfolio_market_value: number;
  movements: UserStatementShareMovement[];
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
  shares?: UserStatementShares;
}

export interface GlobalStatementTransaction {
  id: number;
  created_at: string;
  user_id: number;
  user_name: string;
  user_document: string;
  type: string;
  raw_type: string;
  description: string;
  amount: number;
  is_credit: boolean;
  balance_after: number;
}

export interface GlobalStatementWithdrawal {
  id: number;
  created_at: string;
  user_id: number;
  user_name: string;
  user_document: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  amount: number;
  gmf_tax: number;
  net_amount: number;
  status: string;
  rejection_reason?: string | null;
}

export interface GlobalStatementInvestment {
  id: number;
  user_id: number;
  user_name: string;
  user_document: string;
  assigned_code: string;
  capital: number;
  porcentaje_mensual: number;
  meses: number;
  fecha_inicio: string;
  estado: string;
  observaciones: string;
}

export interface GlobalAccountStatement {
  statement_date: string;
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_wallets_balance: number;
    total_credits: number;
    total_debits: number;
    total_withdrawn_paid: number;
    total_withdrawn_pending: number;
    total_gmf_tax: number;
    total_capital_active: number;
    total_capital_finished: number;
    active_investors_count: number;
  };
  transactions: GlobalStatementTransaction[];
  withdrawals: GlobalStatementWithdrawal[];
  investments: GlobalStatementInvestment[];
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

  getGlobalStatement: async (params?: { startDate?: string; endDate?: string; userId?: number; txType?: string }): Promise<GlobalAccountStatement> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('start_date', params.startDate);
    if (params?.endDate) queryParams.append('end_date', params.endDate);
    if (params?.userId) queryParams.append('user_id', params.userId.toString());
    if (params?.txType) queryParams.append('tx_type', params.txType);
    const qs = queryParams.toString();
    return await fetchApi(`/users/statement/global${qs ? `?${qs}` : ''}`);
  },

  getMyChildren: async (): Promise<User[]> => {
    return await fetchApi('/users/my-children');
  },

  switchToChild: async (childId: number): Promise<{ access_token: string; token_type: string; user: User }> => {
    return await fetchApi(`/auth/switch-account/${childId}`, {
      method: 'POST',
    });
  },

  switchBackToParent: async (): Promise<{ access_token: string; token_type: string; user: User }> => {
    return await fetchApi('/auth/switch-back', {
      method: 'POST',
    });
  },

  getMyProfile: async (): Promise<User> => {
    return await fetchApi('/users/me/profile');
  },

  updateMyProfile: async (data: UserProfileUpdateData): Promise<User> => {
    return await fetchApi('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changeMyPassword: async (data: UserPasswordChangeData): Promise<{ message: string }> => {
    return await fetchApi('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  forceProfileUpdate: async (userIds?: number[], forceAll = false): Promise<{ message: string; affected_count: number }> => {
    return await fetchApi('/users/admin/force-profile-update', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, force_all: forceAll }),
    });
  },

  toggleForceProfile: async (userId: number, forceValue?: boolean): Promise<User> => {
    const qs = forceValue !== undefined ? `?force_value=${forceValue}` : '';
    return await fetchApi(`/users/${userId}/toggle-force-profile${qs}`, {
      method: 'POST',
    });
  },
};

export interface UserProfileUpdateData {
  name: string;
  email: string;
  document_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
}

export interface UserPasswordChangeData {
  current_password: string;
  new_password: string;
}
