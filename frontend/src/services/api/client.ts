const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return null;
    }

    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return null;
  }
}

export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    let body: any;
    try {
      body = await response.clone().json();
    } catch {
      body = {};
    }

    if (body?.code === 'TOKEN_STALE') {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        if (newToken) {
          onRefreshed(newToken);
          const retryHeaders = new Headers(init?.headers);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          if (!retryHeaders.has('Content-Type') && !(init?.body instanceof FormData)) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          return fetch(input, { ...init, headers: retryHeaders });
        }
      } else {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            const retryHeaders = new Headers(init?.headers);
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            if (!retryHeaders.has('Content-Type') && !(init?.body instanceof FormData)) {
              retryHeaders.set('Content-Type', 'application/json');
            }
            resolve(fetch(input, { ...init, headers: retryHeaders }));
          });
        });
      }
    }
  }

  return response;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export { API_URL };
