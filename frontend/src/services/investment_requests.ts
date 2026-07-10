import { fetchApi } from './api';

export const bulkUploadInvestmentRequests = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetchApi('/investment_requests/bulk-upload', {
    method: 'POST',
    body: formData,
  });
  
  return response;
};
