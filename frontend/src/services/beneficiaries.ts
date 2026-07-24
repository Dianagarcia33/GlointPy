import { fetchApi } from './api';

export interface Beneficiary {
    id: number;
    user_id?: number | null;
    investor_id?: number | null;
    name: string;
    document_number?: string | null;
    relationship?: string | null;
    percentage: number;
    phone?: string | null;
    email?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface BeneficiaryCreate {
    name: string;
    document_number?: string | null;
    relationship?: string | null;
    percentage: number;
    phone?: string | null;
    email?: string | null;
}

export interface BeneficiaryUpdate {
    name?: string;
    document_number?: string | null;
    relationship?: string | null;
    percentage?: number;
    phone?: string | null;
    email?: string | null;
}

export const beneficiariesService = {
    getMyBeneficiaries: async (): Promise<Beneficiary[]> => {
        return await fetchApi('/beneficiaries/me');
    },

    createMyBeneficiary: async (data: BeneficiaryCreate): Promise<Beneficiary> => {
        return await fetchApi('/beneficiaries/me', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateMyBeneficiary: async (id: number, data: BeneficiaryUpdate): Promise<Beneficiary> => {
        return await fetchApi(`/beneficiaries/me/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteMyBeneficiary: async (id: number): Promise<void> => {
        await fetchApi(`/beneficiaries/me/${id}`, {
            method: 'DELETE'
        });
    },

    getUserBeneficiariesAdmin: async (userId: number): Promise<Beneficiary[]> => {
        return await fetchApi(`/beneficiaries/user/${userId}`);
    }
};
