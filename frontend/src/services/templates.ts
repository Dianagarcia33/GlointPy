import { api } from './api';

export interface DocumentTemplate {
    id: number;
    name: string;
    type: string;
    role_id?: number | null;
    file_path?: string | null;
    html_content?: string | null;
    background_image?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface DocumentTemplateCreate {
    name: string;
    type: string;
    role_id?: number | null;
    file_path?: string | null;
    html_content?: string | null;
    background_image?: string | null;
}

export interface DocumentTemplateUpdate {
    name?: string;
    type?: string;
    role_id?: number | null;
    file_path?: string | null;
    html_content?: string | null;
    background_image?: string | null;
}

export const templatesService = {
    getTemplates: async (): Promise<DocumentTemplate[]> => {
        const response = await api.get<DocumentTemplate[]>('/templates');
        return response.data;
    },

    getTemplate: async (id: number): Promise<DocumentTemplate> => {
        const response = await api.get<DocumentTemplate>(`/templates/${id}`);
        return response.data;
    },

    createTemplate: async (data: DocumentTemplateCreate): Promise<DocumentTemplate> => {
        const response = await api.post<DocumentTemplate>('/templates', data);
        return response.data;
    },

    updateTemplate: async (id: number, data: DocumentTemplateUpdate): Promise<DocumentTemplate> => {
        const response = await api.put<DocumentTemplate>(`/templates/${id}`, data);
        return response.data;
    },

    deleteTemplate: async (id: number): Promise<void> => {
        await api.delete(`/templates/${id}`);
    }
};
