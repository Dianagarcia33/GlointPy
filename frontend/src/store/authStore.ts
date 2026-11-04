import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  is_superuser?: boolean;
  document_id?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  must_update_profile?: boolean;
  must_change_password?: boolean;
  parent_user_id?: number | null;
  parent?: any;
  children?: any[];
  roles_list?: string[];
  roles?: any[];
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  // Solo el usuario del tutor (para el aviso de supervisión). Nunca se guarda un token en el cliente (H-33).
  parentBackup: { user: User } | null;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setParentBackup: (backup: { user: User } | null) => void;
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
      isAuthenticated: false,
      parentBackup: null,
      // La sesión vive en la cookie HttpOnly que fija el servidor; aquí solo queda el estado de la interfaz.
      login: (user) => set({ user: normalizeUser(user), isAuthenticated: true }),
      logout: () => {
        const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'X-Gloint-Client': 'web' } }).catch(() => {});
        set({ user: null, isAuthenticated: false, parentBackup: null });
      },
      setUser: (user) => {
        const normalized = normalizeUser(user);
        set((state) => {
          if (!normalized) {
            return { user: null, isAuthenticated: false };
          }
          if (state.user && state.user.id === normalized.id) {
            const samePerms = (state.user.permissions || []).length === (normalized.permissions || []).length &&
              (state.user.permissions || []).every((p, i) => p === (normalized.permissions || [])[i]);
            const sameRoles = (state.user.roles_list || []).length === (normalized.roles_list || []).length &&
              (state.user.roles_list || []).every((r, i) => r === (normalized.roles_list || [])[i]);
            const sameName = state.user.name === normalized.name;
            const sameEmail = state.user.email === normalized.email;
            const sameDoc = state.user.document_id === normalized.document_id;
            const samePhone = state.user.phone_number === normalized.phone_number;
            const sameDob = state.user.date_of_birth === normalized.date_of_birth;
            const sameMustUpdate = Boolean(state.user.must_update_profile) === Boolean(normalized.must_update_profile);
            const sameMustChangePass = Boolean(state.user.must_change_password) === Boolean(normalized.must_change_password);
            const sameParent = state.user.parent_user_id === normalized.parent_user_id;

            if (samePerms && sameRoles && sameName && sameEmail && sameDoc && samePhone && sameDob && sameMustUpdate && sameMustChangePass && sameParent) {
              return state;
            }
          }
          return { user: normalized, isAuthenticated: true };
        });
      },
      setParentBackup: (parentBackup) => set({ parentBackup }),
    }),
    {
      name: 'auth-storage',
      version: 2,
      // v1 guardaba accessToken y el token del tutor en localStorage (H-33): se descartan al migrar.
      migrate: (persisted: any) => {
        const { accessToken: _drop, ...rest } = persisted || {};
        if (rest.parentBackup) rest.parentBackup = { user: rest.parentBackup.user };
        return rest;
      },
      // Solo una pista para la interfaz (sin tokens): evita parpadeos al recargar. La sesión real es la cookie
      // HttpOnly y App.tsx la confirma con /auth/me; el servidor decide siempre los permisos.

      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user
          ? {
              id: state.user.id,
              name: state.user.name,
              email: state.user.email,
              is_active: state.user.is_active,
              must_update_profile: state.user.must_update_profile,
              must_change_password: state.user.must_change_password,
              parent_user_id: state.user.parent_user_id,
              roles_list: state.user.roles_list,
              permissions: state.user.permissions,
            }
          : null,
        parentBackup: state.parentBackup
          ? {
              user: state.parentBackup.user,
            }
          : null,
      }),
    }
  )
);
