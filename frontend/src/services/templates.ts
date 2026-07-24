import { fetchApi } from './api';

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
        return await fetchApi('/templates');
    },

    getTemplate: async (id: number): Promise<DocumentTemplate> => {
        return await fetchApi(`/templates/${id}`);
    },

    createTemplate: async (data: DocumentTemplateCreate): Promise<DocumentTemplate> => {
        return await fetchApi('/templates', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateTemplate: async (id: number, data: DocumentTemplateUpdate): Promise<DocumentTemplate> => {
        return await fetchApi(`/templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteTemplate: async (id: number): Promise<void> => {
        await fetchApi(`/templates/${id}`, {
            method: 'DELETE'
        });
    }
};
