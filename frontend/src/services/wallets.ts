import { fetchApi } from './api';

export const bulkUploadWallets = async (file: File): Promise<{ success_count: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/wallets/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};
