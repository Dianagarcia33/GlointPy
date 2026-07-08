import { fetchApi } from './api';
import { User } from './users';
import { Package } from './packages';
import { Period } from './periods';

export interface Investor {
  id: number;
  assigned_code: string;
  referred_by?: string;
  user_id: number;
  package_id: number;
  period_id: number;
  start_date: string;
  end_date: string;
  observations?: string;
  created_at: string;
  updated_at?: string;
  
  user?: User;
  package?: Package;
  period?: Period;
}

export const getInvestors = async () => {
  return await fetchApi('/investors/');
};

export const createInvestor = async (data: Partial<Investor>) => {
  return await fetchApi('/investors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateInvestor = async (id: number, data: Partial<Investor>) => {
  return await fetchApi(`/investors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteInvestor = async (id: number) => {
  return await fetchApi(`/investors/${id}`, {
    method: 'DELETE',
  });
};

export const bulkUploadInvestors = async (file: File): Promise<{ success: number; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/investors/bulk-upload', {
    method: 'POST',
    body: formData,
  });
};
