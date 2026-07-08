import api from './api';

export interface Package {
    id: number;
    value: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PackageCreate {
    value: number;
    is_active?: boolean;
}

export interface PackageUpdate {
    value?: number;
    is_active?: boolean;
}

export const packagesService = {
    getPackages: async (): Promise<Package[]> => {
        const response = await api.get('/packages/');
        return response.data;
    },

    getPackage: async (id: number): Promise<Package> => {
        const response = await api.get(`/packages/${id}`);
        return response.data;
    },

    createPackage: async (data: PackageCreate): Promise<Package> => {
        const response = await api.post('/packages/', data);
        return response.data;
    },

    updatePackage: async (id: number, data: PackageUpdate): Promise<Package> => {
        const response = await api.put(`/packages/${id}`, data);
        return response.data;
    },

    deletePackage: async (id: number): Promise<void> => {
        await api.delete(`/packages/${id}`);
    }
};
