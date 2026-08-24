import { fetchApi } from './api';

export interface InvestorDocument {
    id: number;
    investor_id: number;
    user_id: number;
    template_id: number | null;
    title: string;
    document_type: string;
    html_content: string;
    background_image: string | null;
    created_at: string;
    updated_at: string;
}

export interface InvestorDocumentPreview {
    template_id: number;
    template_name: string;
    title: string;
    document_type: string;
    html_content: string;
    background_image: string | null;
}

export interface InvestorDocumentBulkGenerateRequest {
    template_id: number;
    target_type: 'all' | 'selected' | 'without_document';
    investor_ids?: number[];
    custom_title?: string;
    background_image?: string;
    overwrite_existing?: boolean;
}

export interface InvestorDocumentBulkGenerateResponse {
    total_candidates: number;
    generated_count: number;
    skipped_count: number;
    errors: string[];
}

export const investorDocumentsService = {
    previewDocument: async (investorId: number, templateId: number, backgroundImage?: string): Promise<InvestorDocumentPreview> => {
        return await fetchApi('/investor-documents/preview', {
            method: 'POST',
            body: JSON.stringify({ 
                investor_id: investorId, 
                template_id: templateId,
                background_image: backgroundImage 
            })
        });
    },

    generateDocument: async (investorId: number, templateId: number, customTitle?: string, backgroundImage?: string): Promise<InvestorDocument> => {
        return await fetchApi('/investor-documents/generate', {
            method: 'POST',
            body: JSON.stringify({ 
                investor_id: investorId, 
                template_id: templateId, 
                custom_title: customTitle,
                background_image: backgroundImage
            })
        });
    },

    bulkGenerateDocuments: async (data: InvestorDocumentBulkGenerateRequest): Promise<InvestorDocumentBulkGenerateResponse> => {
        return await fetchApi('/investor-documents/bulk-generate', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getDocumentsByInvestor: async (investorId: number): Promise<InvestorDocument[]> => {
        return await fetchApi(`/investor-documents/investor/${investorId}`);
    },

    getMyDocuments: async (investorId?: number): Promise<InvestorDocument[]> => {
        const query = investorId ? `?investor_id=${investorId}` : '';
        return await fetchApi(`/investor-documents/my-documents${query}`);
    },

    getDocumentById: async (documentId: number): Promise<InvestorDocument> => {
        return await fetchApi(`/investor-documents/${documentId}`);
    },

    deleteDocument: async (documentId: number): Promise<void> => {
        await fetchApi(`/investor-documents/${documentId}`, {
            method: 'DELETE'
        });
    }
};
