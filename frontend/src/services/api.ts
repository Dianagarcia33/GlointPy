import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = API_URL.replace(/\/api\/v1\/?$/, '');

  if (cleanPath.startsWith('/uploads/')) {
    return `${baseUrl}/api/v1${cleanPath}`;
  }

  return `${baseUrl}${cleanPath}`;
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.append('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet o si tienes problemas de red (Network Error).");
    }
    throw err;
  }

  if (response.status === 401) {
      if (endpoint.includes('/login')) {
          throw new Error("Credenciales inválidas. Verifica tu correo y contraseña.");
      } else {
          useAuthStore.getState().logout();
          throw new Error("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
      }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errMsg = 'Error en la petición al servidor';
    if (errorData.detail) {
      if (typeof errorData.detail === 'string') {
        errMsg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errMsg = errorData.detail.map((e: any) => `${e.loc?.join('.') || 'Campo'}: ${e.msg}`).join(', ');
      } else {
        errMsg = JSON.stringify(errorData.detail);
      }
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}
