import { fetchApi } from './api';

export interface Period {
  id: number;
  percentage: number;
  months: number;
  days: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PeriodCreate {
  id?: number;
  percentage: number;
  months: number;
  days: number;
  is_active?: boolean;
}

export interface PeriodUpdate {
  id?: number;
  percentage?: number;
  months?: number;
  days?: number;
  is_active?: boolean;
}

export const periodsService = {
  getPeriods: async (): Promise<Period[]> => {
    return await fetchApi('/periods');
  },

  createPeriod: async (data: PeriodCreate): Promise<Period> => {
    return await fetchApi('/periods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePeriod: async (id: number, data: PeriodUpdate): Promise<Period> => {
    return await fetchApi(`/periods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePeriod: async (id: number): Promise<void> => {
    return await fetchApi(`/periods/${id}`, {
      method: 'DELETE',
    });
  },
};
