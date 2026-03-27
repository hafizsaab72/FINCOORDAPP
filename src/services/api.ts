import { API_URL } from '../constants/config';
import { useStore } from '../store/useStore';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function apiFetch<T = any>(
  path: string,
  method: Method = 'GET',
  body?: object,
): Promise<T> {
  const token = useStore.getState().token;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
