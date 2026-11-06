import { fetchApi } from './api';

export interface YointBank {
  id: string;
  name: string;
}

export interface InitPayinPayload {
  payin_type: 'WALLET_TOPUP' | 'INVESTMENT_REQUEST' | 'CREDIT_INSTALLMENT';
  amount: number;
  payment_method: 'NEQUI' | 'BOTON_BANCOLOMBIA' | 'PSE';
  investment_request_id?: number;
  phone_nequi?: string;
  bank_id?: string;
  redirect_url?: string;
}

export interface InitPayinResponse {
  success: boolean;
  payin_id: number;
  order_id: string;
  transaction_id?: string;
  redirect_url?: string;
  payment_method: string;
  status: string;
  error?: string;
}

export interface PayinStatusResponse {
  payin_id: number;
  order_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REJECTED' | 'EXPIRED' | string;
  payment_method: string;
  amount: number;
  payin_type: string;
  redirect_url?: string;
  investment_request_id?: number;
  investment_approved: boolean;
  wallet_recharge_id?: number;
  recharge_approved?: boolean;
  created_at: string;
  updated_at: string;
}

export const yointService = {
  async getBanks(): Promise<YointBank[]> {
    return await fetchApi('/yoint/payins/banks');
  },

  async initPayin(payload: InitPayinPayload): Promise<InitPayinResponse> {
    return await fetchApi('/yoint/payins/init', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getPayinStatus(payinId: number): Promise<PayinStatusResponse> {
    return await fetchApi(`/yoint/payins/${payinId}/status`);
  },

  async getMyPayins(): Promise<any[]> {
    return await fetchApi('/yoint/payins/my');
  }
};
