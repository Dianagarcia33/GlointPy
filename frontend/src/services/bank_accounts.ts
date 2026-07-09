import { fetchApi } from './api';

export const bulkUploadBankAccounts = async (file: File): Promise<{ success_count: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/bank-accounts/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};
