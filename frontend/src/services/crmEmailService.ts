import { fetchApi } from './api';

export interface EmailAttachment {
  filename: string;
  file_url: string;
  content_type?: string;
  size?: number;
}

export interface CalendarEventInfo {
  uid: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  url?: string;
  organizer?: { name: string; email: string };
  attendees?: Array<{ name: string; email: string }>;
  status?: string;
  user_response?: 'pending' | 'accepted' | 'declined';
  accepted_at?: string;
  declined_at?: string;
  calendar_uid?: string;
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
  body_text?: string | null;
  status: 'draft' | 'sent' | 'delivered' | 'failed' | 'received';
  is_read: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
  calendar_event?: CalendarEventInfo | null;
  cc_emails?: string | null;
  bcc_emails?: string | null;
  attachments?: EmailAttachment[];
  created_at: string;
}

export interface CRMEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

export interface EmailFolderCounts {
  inbox: number;
  unread_inbox: number;
  starred: number;
  sent: number;
  archived: number;
  trash: number;
}

export const crmEmailService = {
  getEmails: async (params?: { folder?: string; search?: string; has_meeting?: boolean }): Promise<CRMEmail[]> => {
    const query = new URLSearchParams();
    if (params?.folder) query.append('folder', params.folder);
    if (params?.search) query.append('search', params.search);
    if (params?.has_meeting) query.append('has_meeting', 'true');
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/crm/emails${qStr}`);
  },

  getFolderCounts: async (): Promise<EmailFolderCounts> => {
    return fetchApi('/crm/emails/counts');
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
    cc_emails?: string;
    bcc_emails?: string;
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
  },

  // Operaciones de Invitaciones a Reunión (Calendar)
  acceptMeeting: async (emailId: number): Promise<{ success: boolean; message: string; calendar_event: CalendarEventInfo }> => {
    return fetchApi(`/crm/emails/${emailId}/accept-meeting`, {
      method: 'POST'
    });
  },

  declineMeeting: async (emailId: number): Promise<{ success: boolean; message: string; calendar_event: CalendarEventInfo }> => {
    return fetchApi(`/crm/emails/${emailId}/decline-meeting`, {
      method: 'POST'
    });
  },

  // Gestión de carpetas y estados de correo
  toggleStar: async (emailId: number): Promise<{ id: number; is_starred: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/star`, {
      method: 'POST'
    });
  },

  toggleArchive: async (emailId: number): Promise<{ id: number; is_archived: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/archive`, {
      method: 'POST'
    });
  },

  moveToTrash: async (emailId: number): Promise<{ id: number; is_deleted: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/trash`, {
      method: 'POST'
    });
  },

  restoreFromTrash: async (emailId: number): Promise<{ id: number; is_deleted: boolean }> => {
    return fetchApi(`/crm/emails/${emailId}/restore`, {
      method: 'POST'
    });
  },

  deletePermanent: async (emailId: number): Promise<{ message: string }> => {
    return fetchApi(`/crm/emails/${emailId}`, {
      method: 'DELETE'
    });
  },

  emptyTrash: async (): Promise<{ message: string; count: number }> => {
    return fetchApi('/crm/emails/trash/empty', {
      method: 'DELETE'
    });
  },

  bulkAction: async (action: string, emailIds: number[]): Promise<{ affected: number; action: string }> => {
    return fetchApi('/crm/emails/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, email_ids: emailIds })
    });
  },

  createLeadFromEmail: async (
    emailId: number, 
    data?: { name?: string; phone?: string; project_id?: number }
  ): Promise<{ success: boolean; lead_id: number; lead_name: string; message: string }> => {
    return fetchApi(`/crm/emails/${emailId}/create-lead`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }
};
