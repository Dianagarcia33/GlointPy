import { fetchApi } from '../utils/api';

export interface Permission {
  id: number;
  name: string;
  module: string | null;
  action: string | null;
  description: string | null;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  permissions: Permission[];
  created_at?: string;
  updated_at?: string;
}

export interface RoleCreate {
  name: string;
  display_name: string;
  description?: string;
  is_active?: boolean;
  permissions: number[]; // Array of Permission IDs
}

export interface RoleUpdate {
  name?: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
  permissions?: number[]; // Array of Permission IDs
}

export const rolesService = {
  getAllRoles: async (): Promise<Role[]> => {
    return await fetchApi('/roles/');
  },

  getAllPermissions: async (): Promise<Permission[]> => {
    return await fetchApi('/roles/permissions');
  },

  createRole: async (data: RoleCreate): Promise<Role> => {
    return await fetchApi('/roles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRole: async (id: number, data: RoleUpdate): Promise<Role> => {
    return await fetchApi(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteRole: async (id: number): Promise<void> => {
    return await fetchApi(`/roles/${id}`, {
      method: 'DELETE',
    });
  }
};
