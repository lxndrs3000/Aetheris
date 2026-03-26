const BASE = import.meta.env.DEV ? 'http://localhost:3000' : 'https://aetheris-api-yjyw.onrender.com';

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
