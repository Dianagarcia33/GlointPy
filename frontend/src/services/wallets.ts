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
