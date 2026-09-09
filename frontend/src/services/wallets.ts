import { fetchApi } from './api';

export const bulkUploadWallets = async (file: File): Promise<{ success_count: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/wallets/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};

export const bulkUploadWalletTransactions = async (file: File): Promise<{ success_count: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/wallets/transactions/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};

export const adjustWalletBalance = async (
  walletId: number, 
  data: { action: 'add' | 'subtract' | 'set'; amount: number; description: string }
): Promise<{ message: string; new_balance: number }> => {
  return await fetchApi(`/wallets/admin/wallets/${walletId}/adjust`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export interface VerifyRecipientResponse {
  recipient_id: number;
  name: string;
  email: string;
  document_id: string;
  masked_document: string;
}

export const verifyTransferRecipient = async (identifier: string): Promise<VerifyRecipientResponse> => {
  return await fetchApi('/wallets/transfer/verify-recipient', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const transferWalletFunds = async (data: {
  identifier: string;
  monto: number;
  notes?: string;
}): Promise<{ message: string; amount: number; recipient_name: string; new_balance: number }> => {
  return await fetchApi('/wallets/transfer', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const getMyWallet = async (): Promise<{ balance: number | string; currency?: string }> => {
  return await fetchApi('/wallets/me');
};

export interface WalletRecharge {
  id: number;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_document?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_method: string;
  reference_number?: string;
  receipt_url: string;
  user_notes?: string;
  admin_notes?: string;
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  created_at?: string;
}

export const createWalletRecharge = async (data: {
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  receipt: File;
}): Promise<{ message: string; recharge: WalletRecharge }> => {
  const formData = new FormData();
  formData.append('amount', data.amount.toString());
  formData.append('payment_method', data.payment_method);
  if (data.reference_number) formData.append('reference_number', data.reference_number);
  if (data.notes) formData.append('notes', data.notes);
  formData.append('receipt', data.receipt);

  return await fetchApi('/wallets/me/recharge', {
    method: 'POST',
    body: formData,
  });
};

export const getMyRecharges = async (): Promise<WalletRecharge[]> => {
  return await fetchApi('/wallets/me/recharges');
};

export const cancelMyRecharge = async (rechargeId: number): Promise<{ message: string }> => {
  return await fetchApi(`/wallets/me/recharges/${rechargeId}/cancel`, {
    method: 'POST',
  });
};

export const getAllRechargesAdmin = async (statusFilter?: string, search?: string): Promise<WalletRecharge[]> => {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter !== 'todos' && statusFilter !== 'all') params.append('status_filter', statusFilter);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await fetchApi(`/wallets/admin/recharges${query}`);
};

export const approveRechargeAdmin = async (rechargeId: number, adminNotes?: string): Promise<{ message: string; new_balance: number }> => {
  return await fetchApi(`/wallets/admin/recharges/${rechargeId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_notes: adminNotes || null }),
  });
};

export const rejectRechargeAdmin = async (rechargeId: number, reason: string): Promise<{ message: string }> => {
  return await fetchApi(`/wallets/admin/recharges/${rechargeId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};
