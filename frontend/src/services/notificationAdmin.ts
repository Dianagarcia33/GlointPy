import { fetchApi } from './api';

export interface TargetOptionsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface TargetOptionsResponse {
  roles: Array<{ id: number; name: string; description?: string }>;
  users: Array<{ id: number; name: string; email: string; document_id?: string }>;
  total_users?: number;
  page?: number;
  limit?: number;
}

export interface AdminBroadcastPayload {
  title: string;
  message: string;
  type: 'sistema' | 'anuncio' | 'mantenimiento' | 'alerta';
  target_audience: 'all' | 'role' | 'specific_users';
  target_role_id?: number;
  target_user_ids?: number[];
  link?: string;
  send_push: boolean;
}

export interface AdminBroadcastLogItem {
  id: number;
  sender_id?: number;
  sender_name?: string;
  title: string;
  message: string;
  type: 'sistema' | 'anuncio' | 'mantenimiento' | 'alerta';
  target_audience: string;
  target_role_name?: string;
  recipients_count: number;
  link?: string;
  sent_push: boolean;
  created_at: string;
}

export const notificationAdminService = {
  getTargetOptions: async (params?: TargetOptionsParams): Promise<TargetOptionsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    return await fetchApi<TargetOptionsResponse>(`/notifications/admin/target-options${qs ? `?${qs}` : ''}`);
  },

  sendBroadcast: async (payload: AdminBroadcastPayload): Promise<{ success: boolean; message: string; recipients_count: number }> => {
    return await fetchApi('/notifications/admin/send-broadcast', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getBroadcastHistory: async (limit: number = 50): Promise<AdminBroadcastLogItem[]> => {
    return await fetchApi<AdminBroadcastLogItem[]>(`/notifications/admin/broadcast-history?limit=${limit}`);
  }
};
