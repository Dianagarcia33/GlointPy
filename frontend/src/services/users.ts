import { fetchApi } from './api';
import { Role } from './roles';

export interface User {
  id: number;
  name: string;
  email: string;
  document_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  document_id?: string;
  phone_number?: string;
  date_of_birth?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserUpdate {
  name?: string;
  email?: string;
  document_id?: string;
  phone_number?: string;
  date_of_birth?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export const usersService = {
  getUsers: async (): Promise<User[]> => {
    return await fetchApi('/users');
  },

  createUser: async (data: UserCreate): Promise<User> => {
    return await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (id: number, data: UserUpdate): Promise<User> => {
    return await fetchApi(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
