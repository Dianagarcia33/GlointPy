import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  
  // Proxy external HTTP ticket images when running on HTTPS
  if (path.startsWith('http://161.35.107.122') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const baseUrl = API_URL.replace(/\/api\/v1\/?$/, '');
    return `${baseUrl}/api/v1/tickets/image-proxy?url=${encodeURIComponent(path)}`;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let baseUrl = API_URL.replace(/\/api\/v1\/?$/, '');

  // If baseUrl is empty or relative (e.g. '/api/v1'), prepend window.location.origin!
  if (typeof window !== 'undefined') {
    if (!baseUrl || baseUrl.startsWith('/')) {
      baseUrl = `${window.location.origin}${baseUrl}`;
    }
  }

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
    credentials: options.credentials || 'include',
  };

  const isIdempotent = !options.method || options.method.toUpperCase() === 'GET';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
    if ((response.status === 502 || response.status === 503 || response.status === 504) && isIdempotent) {
      // Reintento automático silencioso para mitigar micro-cortes
      await new Promise(r => setTimeout(r, 600));
      response = await fetch(`${API_URL}${endpoint}`, config);
    }
  } catch (err: any) {
    if (isIdempotent && (err.name === 'TypeError' || err.message === 'Failed to fetch')) {
      try {
        await new Promise(r => setTimeout(r, 600));
        response = await fetch(`${API_URL}${endpoint}`, config);
      } catch (retryErr: any) {
        throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet o si tienes problemas de red (Network Error).");
      }
    } else if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet o si tienes problemas de red (Network Error).");
    } else {
      throw err;
    }
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
