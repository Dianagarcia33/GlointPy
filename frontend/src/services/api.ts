import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().accessToken;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  // Interceptar error 401 (No Autorizado)
  // En el futuro, aquí llamaremos a /refresh silenciosamente con la Cookie HttpOnly
  if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error("Sesión expirada o credenciales inválidas");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error en la petición al servidor');
  }

  return response.json();
}
