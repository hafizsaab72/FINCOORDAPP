import { apiFetch } from './api';
import { Bill } from '../types';

export const billsService = {
  getAll: () =>
    apiFetch<{ bills: Bill[] }>('/bills'),

  create: (payload: Omit<Bill, 'id'>) =>
    apiFetch<{ bill: Bill }>('/bills', 'POST', payload),

  markHandled: (id: string) =>
    apiFetch<{ bill: Bill }>(`/bills/${id}/handle`, 'PUT'),

  delete: (id: string) =>
    apiFetch(`/bills/${id}`, 'DELETE'),
};
