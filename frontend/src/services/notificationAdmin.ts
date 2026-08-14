import { fetchApi } from './api';

export interface TargetOptionsResponse {
  roles: Array<{ id: number; name: string; description?: string }>;
  users: Array<{ id: number; name: string; email: string; document_id?: string }>;
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
  getTargetOptions: async (): Promise<TargetOptionsResponse> => {
    return await fetchApi<TargetOptionsResponse>('/api/v1/notifications/admin/target-options');
  },

  sendBroadcast: async (payload: AdminBroadcastPayload): Promise<{ success: boolean; message: string; recipients_count: number }> => {
    return await fetchApi('/api/v1/notifications/admin/send-broadcast', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getBroadcastHistory: async (limit: number = 50): Promise<AdminBroadcastLogItem[]> => {
    return await fetchApi<AdminBroadcastLogItem[]>(`/api/v1/notifications/admin/broadcast-history?limit=${limit}`);
  }
};
