import { fetchApi } from './api';

export interface EmailAttachment {
  filename: string;
  file_url: string;
  content_type?: string;
  size?: number;
}

export interface CRMEmail {
  id: number;
  lead_id?: number | null;
  lead_name?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  user_id: number;
  user_name: string;
  direction: 'outbound' | 'inbound';
  sender_email: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  status: 'draft' | 'sent' | 'delivered' | 'failed' | 'received';
  is_read: boolean;
  attachments?: EmailAttachment[];
  created_at: string;
}

export interface CRMEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

export const crmEmailService = {
  getEmails: async (params?: { folder?: string; search?: string }): Promise<CRMEmail[]> => {
    const query = new URLSearchParams();
    if (params?.folder) query.append('folder', params.folder);
    if (params?.search) query.append('search', params.search);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/crm/emails${qStr}`);
  },

  getLeadEmails: async (leadId: number): Promise<CRMEmail[]> => {
    return fetchApi(`/crm/emails/leads/${leadId}`);
  },

  getTemplates: async (): Promise<CRMEmailTemplate[]> => {
    return fetchApi('/crm/emails/templates');
  },

  uploadAttachment: async (file: File): Promise<EmailAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi('/crm/emails/upload-attachment', {
      method: 'POST',
      body: formData
    });
  },

  sendEmail: async (data: {
    recipient_email: string;
    subject: string;
    body_html: string;
    lead_id?: number;
    project_id?: number;
    attachments?: EmailAttachment[];
  }): Promise<{ message: string; data: CRMEmail }> => {
    return fetchApi('/crm/emails/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getEmailSettings: async (): Promise<{ has_saved_password: boolean; email: string; host: string; port: number }> => {
    return fetchApi('/crm/emails/settings');
  },

  updateEmailSettings: async (imapPassword?: string): Promise<{ message: string; has_saved_password: boolean }> => {
    return fetchApi('/crm/emails/settings', {
      method: 'POST',
      body: JSON.stringify({ imap_password: imapPassword })
    });
  },

  syncEmails: async (
    imapPass?: string, 
    savePassword?: boolean
  ): Promise<{ synced_count: number; message: string; has_saved_password?: boolean; needs_password?: boolean; error?: string }> => {
    return fetchApi('/crm/emails/sync', {
      method: 'POST',
      body: JSON.stringify({ imap_pass: imapPass, save_password: savePassword })
    });
  },

  markAsRead: async (emailId: number): Promise<{ message: string; id: number; is_read: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/read`, {
      method: 'POST'
    });
  },

  toggleRead: async (emailId: number): Promise<{ id: number; is_read: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/toggle-read`, {
      method: 'POST'
    });
  },

  markAllAsRead: async (): Promise<{ message: string; count: number }> => {
    return fetchApi('/crm/emails/read-all', {
      method: 'POST'
    });
  }
};
