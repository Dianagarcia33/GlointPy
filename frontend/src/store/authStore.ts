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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
      logout: () => {
        const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      // Seguridad: Se excluye el accessToken de localStorage (se gestiona vía Cookie HttpOnly)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
