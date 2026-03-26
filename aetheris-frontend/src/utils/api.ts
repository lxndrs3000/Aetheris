const BASE = 'http://localhost:3000';

export const apiFetch = (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('aetheris_token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};
