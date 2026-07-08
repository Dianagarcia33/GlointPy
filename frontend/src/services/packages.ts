import { fetchApi } from './api';

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
        return await fetchApi('/packages/');
    },

    getPackage: async (id: number): Promise<Package> => {
        return await fetchApi(`/packages/${id}`);
    },

    createPackage: async (data: PackageCreate): Promise<Package> => {
        return await fetchApi('/packages/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updatePackage: async (id: number, data: PackageUpdate): Promise<Package> => {
        return await fetchApi(`/packages/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deletePackage: async (id: number): Promise<void> => {
        await fetchApi(`/packages/${id}`, {
            method: 'DELETE'
        });
    }
};
