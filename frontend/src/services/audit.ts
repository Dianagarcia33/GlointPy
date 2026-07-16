import { fetchApi } from './api';
import { User } from './users';

export interface AuditUser extends User {
    investments?: any[];
    wallet?: any;
}

export const auditService = {
    getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        
        const queryString = queryParams.toString();
        const url = `/audit/users${queryString ? `?${queryString}` : ''}`;
        
        return await fetchApi(url);
    }
};
