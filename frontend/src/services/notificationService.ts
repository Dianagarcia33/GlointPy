import { fetchApi } from './api';

export interface DeviceTokenResponse {
  id: number;
  user_id: number;
  token: string;
  device_type: string;
  is_active: boolean;
  created_at: string;
}

export interface UserNotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface UserNotificationsFeedResponse {
  notifications: UserNotificationItem[];
  unread_count: number;
}

export const notificationService = {
  registerToken: async (token: string, deviceType: string = 'web'): Promise<DeviceTokenResponse> => {
    return await fetchApi('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, device_type: deviceType })
    });
  },

  unregisterToken: async (token: string): Promise<{ success: boolean; message: string }> => {
    return await fetchApi('/notifications/unregister-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  sendTestPush: async (userId: number, title: string, body: string): Promise<any> => {
    return await fetchApi('/notifications/send-test', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, title, body })
    });
  },

  getMyNotifications: async (limit: number = 20): Promise<UserNotificationsFeedResponse> => {
    return await fetchApi(`/notifications/my-notifications?limit=${limit}`);
  },

  markRead: async (notificationId: number): Promise<{ success: boolean }> => {
    return await fetchApi(`/notifications/mark-read/${notificationId}`, {
      method: 'POST'
    });
  },

  markAllRead: async (): Promise<{ success: boolean }> => {
    return await fetchApi('/notifications/mark-all-read', {
      method: 'POST'
    });
  }
};
