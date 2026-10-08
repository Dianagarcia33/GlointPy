import { fetchApi } from './api';

export interface CreditConfig {
  id: number;
  max_usury_rate_ea: number;
  max_usury_rate_monthly: number;
  default_interest_rate_monthly: number;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  allowed_amounts?: string;
  allowed_terms?: string;
  updated_at: string;
}

export interface CreditConfigUpdate {
  max_usury_rate_ea?: number;
  max_usury_rate_monthly?: number;
  default_interest_rate_monthly?: number;
  min_amount?: number;
  max_amount?: number;
  min_term_months?: number;
  max_term_months?: number;
  allowed_amounts?: string;
  allowed_terms?: string;
}

export interface CreditSimulationInstallment {
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_balance: number;
}

export interface CreditSimulationResponse {
  amount: number;
  term_months: number;
  interest_rate_monthly: number;
  interest_rate_ea: number;
  monthly_installment: number;
  total_interest: number;
  total_payment: number;
  installments: CreditSimulationInstallment[];
}

export interface CreditInstallment {
  id: number;
  credit_id: number;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  wallet_amount_paid: number;
  external_amount_paid: number;
  paid_amount: number;
  status: 'PENDING' | 'IN_REVIEW' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  payment_method?: string;
  payment_reference?: string;
  receipt_url?: string;
  paid_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}

export interface Credit {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_document?: string;
  user_phone?: string;
  requested_amount: number;
  approved_amount?: number;
  term_months: number;
  interest_rate: number;
  frequency: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'ACTIVE' | 'PAID' | 'REJECTED' | 'CANCELLED';
  purpose?: string;
  user_bank_account_id?: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  disbursed_at?: string;
  disbursement_method?: string;
  disbursement_reference?: string;
  disbursement_receipt_url?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  total_repayable?: number;
  total_paid?: number;
  remaining_balance?: number;
  installments: CreditInstallment[];
}

export interface CreditPaginatedResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: Credit[];
}

export interface UserBankAccountOption {
  id: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
}

// ==========================================
// API CALLS
// ==========================================

export const getCreditConfig = async (): Promise<CreditConfig> => {
  return await fetchApi('/credits/config');
};

export const updateCreditConfig = async (data: CreditConfigUpdate): Promise<CreditConfig> => {
  return await fetchApi('/credits/config', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const simulateCredit = async (
  amount: number,
  termMonths: number,
  interestRate?: number
): Promise<CreditSimulationResponse> => {
  let url = `/credits/simulate?amount=${amount}&term_months=${termMonths}`;
  if (interestRate !== undefined) {
    url += `&interest_rate=${interestRate}`;
  }
  return await fetchApi(url);
};

export const getMyCredits = async (): Promise<Credit[]> => {
  return await fetchApi('/credits/me');
};

export const getMyCreditBankAccounts = async (): Promise<UserBankAccountOption[]> => {
  // 1. Intentar endpoint dedicado de créditos
  try {
    const res = await fetchApi('/credits/me/bank-accounts');
    if (Array.isArray(res) && res.length > 0) {
      return res.map(acc => ({
        id: Number(acc.id),
        banco: String(acc.banco),
        tipo_cuenta: String(acc.tipo_cuenta || 'Ahorros'),
        numero_cuenta: String(acc.numero_cuenta)
      }));
    }
  } catch (err) {
    console.warn('Aviso: /credits/me/bank-accounts falló o no disponible, buscando en Bóveda Bancaria:', err);
  }

  // 2. Fallback a Bóveda Bancaria (/bank-accounts/me)
  try {
    const vaultRes = await fetchApi('/bank-accounts/me');
    if (Array.isArray(vaultRes) && vaultRes.length > 0) {
      return vaultRes.map(acc => ({
        id: Number(acc.id),
        banco: String(acc.banco),
        tipo_cuenta: String(acc.tipo_cuenta || 'Ahorros'),
        numero_cuenta: String(acc.numero_cuenta)
      }));
    }
  } catch (err) {
    console.warn('Aviso: Fallback /bank-accounts/me falló, consultando /wallets/me/balance:', err);
  }

  // 3. Fallback a Cuentas de Retiro (/wallets/me/balance)
  try {
    const walletRes = await fetchApi('/wallets/me/balance');
    if (walletRes?.bank_accounts && Array.isArray(walletRes.bank_accounts) && walletRes.bank_accounts.length > 0) {
      return walletRes.bank_accounts.map((acc: any) => ({
        id: Number(acc.id),
        banco: String(acc.banco),
        tipo_cuenta: String(acc.tipo_cuenta || 'Ahorros'),
        numero_cuenta: String(acc.numero_cuenta)
      }));
    }
    if (walletRes?.bank_details && walletRes.bank_details.banco && walletRes.bank_details.numero_cuenta) {
      return [{
        id: Number(walletRes.bank_details.id || 1),
        banco: String(walletRes.bank_details.banco),
        tipo_cuenta: String(walletRes.bank_details.tipo_cuenta || 'Ahorros'),
        numero_cuenta: String(walletRes.bank_details.numero_cuenta)
      }];
    }
  } catch (err) {
    console.warn('Aviso: Fallback /wallets/me/balance falló:', err);
  }

  return [];
};

export const requestCredit = async (data: {
  amount: number;
  term_months: number;
  purpose?: string;
  user_bank_account_id?: number;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
}): Promise<{ message: string; credit_id: number; status: string }> => {
  return await fetchApi('/credits/me/request', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const payCreditInstallment = async (
  installmentId: number,
  data: {
    use_wallet_amount?: number;
    payment_method?: string;
    payment_reference?: string;
    notes?: string;
    receipt?: File | null;
  }
): Promise<{
  message: string;
  installment_id: number;
  status: string;
  wallet_amount_paid: number;
  external_amount_paid: number;
  paid_amount: number;
}> => {
  const formData = new FormData();
  if (data.use_wallet_amount !== undefined) {
    formData.append('use_wallet_amount', data.use_wallet_amount.toString());
  }
  if (data.payment_method) {
    formData.append('payment_method', data.payment_method);
  }
  if (data.payment_reference) {
    formData.append('payment_reference', data.payment_reference);
  }
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  if (data.receipt) {
    formData.append('receipt', data.receipt);
  }

  return await fetchApi(`/credits/installments/${installmentId}/pay`, {
    method: 'POST',
    body: formData,
  });
};

// ==========================================
// ADMIN API CALLS
// ==========================================

export const getAdminCredits = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<CreditPaginatedResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  return await fetchApi(`/credits/admin?${query.toString()}`);
};

export const getAdminCreditDetail = async (creditId: number): Promise<Credit> => {
  return await fetchApi(`/credits/admin/${creditId}`);
};

export const approveCredit = async (
  creditId: number,
  data: {
    approved_amount?: number;
    term_months?: number;
    interest_rate?: number;
    first_payment_date?: string;
    admin_notes?: string;
  }
): Promise<{
  message: string;
  credit_id: number;
  approved_amount: number;
  status: string;
  disbursement_reference?: string;
  installments_count: number;
}> => {
  return await fetchApi(`/credits/admin/${creditId}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const rejectCredit = async (
  creditId: number,
  reason: string
): Promise<{ message: string; credit_id: number; status: string; reason: string }> => {
  return await fetchApi(`/credits/admin/${creditId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const getPendingReviewInstallments = async (): Promise<Array<{
  installment_id: number;
  credit_id: number;
  installment_number: number;
  user_name: string;
  user_email?: string;
  due_date: string;
  total_amount: number;
  wallet_amount_paid: number;
  external_amount_paid: number;
  paid_amount: number;
  payment_reference?: string;
  receipt_url?: string;
  created_at: string;
  notes?: string;
}>> => {
  return await fetchApi('/credits/admin/installments/pending-review');
};

export const reviewInstallment = async (
  installmentId: number,
  data: { approve: boolean; rejection_reason?: string }
): Promise<{ message: string; installment_id: number; status: string }> => {
  return await fetchApi(`/credits/admin/installments/${installmentId}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};
