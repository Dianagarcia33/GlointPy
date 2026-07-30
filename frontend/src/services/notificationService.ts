import { fetchApi } from './api';

export interface DeviceTokenResponse {
  id: number;
  user_id: number;
  token: string;
  device_type: string;
  is_active: boolean;
  created_at: string;
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
  }
};
