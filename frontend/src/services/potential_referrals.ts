import { fetchApi } from './api';

export interface PotentialReferral {
    id: number;
    investor_id: number;
    nombre: string;
    telefono: string;
    email?: string | null;
    codigo_referido: string;
    estado: 'pendiente' | 'contactado' | 'registrado' | 'rechazado';
    notas?: string | null;
    fecha_contacto?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface PotentialReferralCreate {
    nombre: string;
    telefono: string;
    email?: string | null;
    codigo_referido?: string | null;
    notas?: string | null;
}

export interface PotentialReferralUpdate {
    nombre?: string;
    telefono?: string;
    email?: string | null;
    estado?: string;
    notas?: string | null;
    fecha_contacto?: string | null;
}

export const potentialReferralsService = {
    getMyReferrals: async (): Promise<PotentialReferral[]> => {
        return await fetchApi('/potential-referrals/me');
    },

    createMyReferral: async (data: PotentialReferralCreate): Promise<PotentialReferral> => {
        return await fetchApi('/potential-referrals/me', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getAllAdmin: async (params?: { search?: string; estado?: string; page?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.estado) queryParams.append('estado', params.estado);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        const url = `/potential-referrals/admin${queryString ? `?${queryString}` : ''}`;
        return await fetchApi(url);
    },

    updateReferral: async (id: number, data: PotentialReferralUpdate): Promise<PotentialReferral> => {
        return await fetchApi(`/potential-referrals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteReferral: async (id: number): Promise<void> => {
        await fetchApi(`/potential-referrals/${id}`, {
            method: 'DELETE'
        });
    }
};
