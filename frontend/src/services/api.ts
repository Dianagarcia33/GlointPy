import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
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
    throw new Error(errorData.detail || 'Error en la petición al servidor');
  }

  return response.json();
}
