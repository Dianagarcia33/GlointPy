import { fetchApi } from '../../../../services/api';
import { PaginatedAuditUsers, AuditUserHistory } from '../types';

export const auditService = {
  getAuditUsers: async (page = 1, limit = 20, search = ''): Promise<PaginatedAuditUsers> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const data = await fetchApi(`/audit/users?${params.toString()}`);
    return data as PaginatedAuditUsers;
  },

  getUserHistory: async (userId: number): Promise<AuditUserHistory> => {
    const data = await fetchApi(`/audit/users/${userId}/history`);
    return data as AuditUserHistory;
  }
};
