import { fetchApi } from './api';

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

  sendEmail: async (data: {
    recipient_email: string;
    subject: string;
    body_html: string;
    lead_id?: number;
    project_id?: number;
  }): Promise<{ message: string; data: CRMEmail }> => {
    return fetchApi('/crm/emails/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  syncEmails: async (imapPass?: string): Promise<{ synced_count: number; message: string; error?: string }> => {
    return fetchApi('/crm/emails/sync', {
      method: 'POST',
      body: JSON.stringify({ imap_pass: imapPass })
    });
  }
};
