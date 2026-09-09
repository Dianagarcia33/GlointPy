import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  is_superuser?: boolean;
  roles_list?: string[];
  roles?: any[];
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const normalizeUser = (user: User | null): User | null => {
  if (!user) return null;
  const perms = new Set<string>(user.permissions || []);
  const rolesList = new Set<string>(user.roles_list || []);
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((r: any) => {
      if (typeof r === 'string') {
        rolesList.add(r);
      } else if (r?.name) {
        rolesList.add(r.name);
      }
      if (r?.permissions && Array.isArray(r.permissions)) {
        r.permissions.forEach((p: any) => {
          if (typeof p === 'string') perms.add(p);
          else if (p?.name) perms.add(p.name);
        });
      }
    });
  }
  return {
    ...user,
    permissions: Array.from(perms),
    roles_list: Array.from(rolesList),
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, token) => set({ user: normalizeUser(user), accessToken: token, isAuthenticated: true }),
      logout: () => {
        const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user: normalizeUser(user), isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      // Persistir token, usuario y autenticación para mantener la sesión activa al recargar
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);
