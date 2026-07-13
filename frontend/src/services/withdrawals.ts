import { fetchApi } from './api';

export interface Withdrawal {
  id?: number;
  user_id: number;
  monto: number;
  monto_neto: number;
  origen?: string;
  tipo: string;
  estado?: string;
  fecha_solicitud: string;
  [key: string]: any; // Allow other properties
}

export const bulkUploadWithdrawalsJSON = async (withdrawals: any[]) => {
  const response = await fetchApi('/withdrawals/bulk-upload', {
    method: 'POST',
    body: JSON.stringify(withdrawals),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response;
};
