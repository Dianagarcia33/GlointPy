import { fetchApi } from './api';

export interface CRMProject {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  target_amount: number;
  raised_amount: number;
  progress_percentage: number;
  status: 'activo' | 'en_pausa' | 'meta_alcanzada' | 'archivado';
  total_leads: number;
  active_leads: number;
  won_leads: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
}

export type CRMLeadStage = 'lead_entrante' | 'contactado' | 'cita_presentacion' | 'negociacion' | 'cierre_ganado' | 'perdido';

export interface CRMLead {
  id: number;
  project_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  document_id?: string | null;
  estimated_amount: number;
  stage: CRMLeadStage;
  source?: string | null;
  commercial_id?: number | null;
  commercial_name?: string | null;
  loss_reason?: string | null;
  activities_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CRMActivity {
  id: number;
  lead_id: number;
  user_id: number;
  user_name: string;
  type: 'nota' | 'llamada' | 'reunion' | 'tarea';
  title: string;
  description?: string | null;
  due_date?: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface CRMKPIs {
  total_projects: number;
  total_leads: number;
  won_leads: number;
  pipeline_amount: number;
  won_amount: number;
  conversion_rate: number;
}

export const crmService = {
  getKPIs: async (): Promise<CRMKPIs> => {
    return fetchApi('/crm/kpis');
  },

  getProjects: async (params?: { search?: string; status?: string }): Promise<CRMProject[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/crm/projects${qStr}`);
  },

  createProject: async (data: {
    code: string;
    name: string;
    description?: string;
    target_amount: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ id: number; code: string }> => {
    return fetchApi('/crm/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getProjectLeads: async (projectId: number, search?: string): Promise<CRMLead[]> => {
    const qStr = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchApi(`/crm/projects/${projectId}/leads${qStr}`);
  },

  createLead: async (data: {
    project_id: number;
    name: string;
    email?: string;
    phone?: string;
    document_id?: string;
    estimated_amount: number;
    stage?: string;
    source?: string;
    commercial_id?: number;
  }): Promise<{ id: number }> => {
    return fetchApi('/crm/leads', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateLeadStage: async (leadId: number, data: {
    stage: string;
    loss_reason?: string;
    estimated_amount?: number;
  }): Promise<any> => {
    return fetchApi(`/crm/leads/${leadId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getLeadActivities: async (leadId: number): Promise<CRMActivity[]> => {
    return fetchApi(`/crm/leads/${leadId}/activities`);
  },

  addLeadActivity: async (leadId: number, data: {
    type: string;
    title: str;
    description?: string;
    due_date?: string;
  }): Promise<{ id: number }> => {
    return fetchApi(`/crm/leads/${leadId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  convertLeadToSale: async (leadId: number, data?: {
    sale_type?: string;
    commission_rate?: number;
  }): Promise<any> => {
    return fetchApi(`/crm/leads/${leadId}/convert`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }
};
