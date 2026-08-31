import { fetchApi } from './api';

export interface ExternalApp {
  id: number;
  name: string;
  description?: string | null;
  client_id: string;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  redirect_urls?: string | null;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  total_orders: number;
  total_volume_processed: number;
}

export interface ExternalAppCreateInput {
  name: string;
  description?: string;
  webhook_url?: string;
  redirect_urls?: string;
  is_active?: boolean;
}

export interface ExternalAppCreatedResponse extends ExternalApp {
  api_key: string;
}

export interface ExternalPaymentOrder {
  id: number;
  payment_token: string;
  app_id: number;
  app_name?: string;
  user_id?: number | null;
  user_name?: string;
  order_reference: string;
  amount: number;
  currency: string;
  description?: string | null;
  status: 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed';
  redirect_url?: string | null;
  webhook_status: string;
  created_at: string;
  completed_at?: string | null;
}

export interface CheckoutOrderInfo {
  payment_token: string;
  app_name: string;
  app_client_id: string;
  order_reference: string;
  amount: number;
  currency: string;
  description?: string | null;
  status: string;
  redirect_url?: string | null;
  expires_at?: string | null;
}

export const externalAppsService = {
  // Admin Endpoints
  getApps: async (): Promise<ExternalApp[]> => {
    return await fetchApi('/admin/external-apps');
  },

  createApp: async (data: ExternalAppCreateInput): Promise<ExternalAppCreatedResponse> => {
    return await fetchApi('/admin/external-apps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateApp: async (id: number, data: Partial<ExternalAppCreateInput>): Promise<ExternalApp> => {
    return await fetchApi(`/admin/external-apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  regenerateApiKey: async (id: number): Promise<{ app_id: number; name: string; client_id: string; api_key: string; webhook_secret: string; message: string }> => {
    return await fetchApi(`/admin/external-apps/${id}/regenerate-key`, {
      method: 'POST',
    });
  },

  deleteApp: async (id: number): Promise<{ message: string }> => {
    return await fetchApi(`/admin/external-apps/${id}`, {
      method: 'DELETE',
    });
  },

  getAllOrders: async (limit: number = 100): Promise<ExternalPaymentOrder[]> => {
    return await fetchApi(`/admin/external-apps/orders/all?limit=${limit}`);
  },

  // Public Checkout Endpoints
  getCheckoutOrderInfo: async (token: string): Promise<CheckoutOrderInfo> => {
    return await fetchApi(`/checkout/order-info?token=${encodeURIComponent(token)}`);
  },

  confirmCheckoutPayment: async (paymentToken: string, securityPin?: string): Promise<{
    status: string;
    message: string;
    payment_token: string;
    order_reference: string;
    app_name: string;
    amount_paid: number;
    new_wallet_balance: number;
    redirect_url?: string | null;
  }> => {
    return await fetchApi('/checkout/confirm', {
      method: 'POST',
      body: JSON.stringify({
        payment_token: paymentToken,
        security_pin: securityPin,
      }),
    });
  },
};
