import { apiFetch } from './api';
import { Payer, Split } from '../types';

export interface CreateExpensePayload {
  title: string;
  description?: string;
  totalAmount: number; // major units — converted to minor by service
  currency: string;
  contextType: 'group' | 'non_group';
  groupId?: string | null;
  directParticipants?: string[];
  participants?: { userId: string; name: string; isActive: boolean }[];
  payments: Payer[];
  splits: Split[];
  splitType: string;
  notes?: string;
  date?: string;
  category?: string;
  isRecurring?: boolean;
  recurrenceRule?: { frequency: string; startDate: string; endDate?: string } | null;
}

export interface UpdateExpensePatch {
  title?: string;
  description?: string;
  totalAmount?: number;
  currency?: string;
  splitType?: string;
  payments?: Payer[];
  splits?: Split[];
  participants?: { userId: string; name: string; isActive: boolean }[];
  notes?: string;
  date?: string;
  category?: string;
}

function toApiPayload(payload: CreateExpensePayload | UpdateExpensePatch): any {
  const api: any = {};
  if ('title' in payload && payload.title !== undefined) api.title = payload.title;
  if (payload.description !== undefined) api.description = payload.description;
  if (payload.totalAmount !== undefined) api.totalAmount = payload.totalAmount; // backend does toMinorUnits
  if (payload.currency !== undefined) api.currency = payload.currency;
  if ('contextType' in payload && payload.contextType !== undefined) api.contextType = payload.contextType;
  if ('groupId' in payload && payload.groupId !== undefined) api.groupId = payload.groupId;
  if ('directParticipants' in payload && payload.directParticipants !== undefined) api.directParticipants = payload.directParticipants;
  if ('participants' in payload && payload.participants !== undefined) {
    api.participants = payload.participants.map(p => ({
      userId: p.userId,
      name: p.name,
      isActive: p.isActive,
    }));
  }
  if (payload.payments !== undefined) {
    api.payments = payload.payments.map(p => ({
      userId: p.userId,
      amount: p.amountPaid,
    }));
  }
  if (payload.splits !== undefined) {
    api.splits = payload.splits.map(s => ({
      userId: s.userId,
      owedAmount: s.computedAmount,
      shareType: s.splitMethod,
      shareValue: s.value,
    }));
  }
  if (payload.splitType !== undefined) api.splitType = payload.splitType;
  if (payload.notes !== undefined) api.notes = payload.notes;
  if (payload.date !== undefined) api.date = payload.date;
  if (payload.category !== undefined) api.category = payload.category;
  if ('isRecurring' in payload && payload.isRecurring !== undefined) api.isRecurring = payload.isRecurring;
  if ('recurrenceRule' in payload && payload.recurrenceRule !== undefined) api.recurrenceRule = payload.recurrenceRule;
  return api;
}

export const expensesService = {
  getAll: (limit = 100, skip = 0) =>
    apiFetch<{ expenses: any[]; total: number; hasMore: boolean }>(
      `/expenses?limit=${limit}&skip=${skip}`,
    ),

  getByGroup: (groupId: string, limit = 30, skip = 0) =>
    apiFetch<{ expenses: any[]; total: number; hasMore: boolean }>(
      `/expenses?groupId=${groupId}&limit=${limit}&skip=${skip}`,
    ),

  getDirect: (limit = 100, skip = 0) =>
    apiFetch<{ expenses: any[]; total: number; hasMore: boolean }>(
      `/expenses?limit=${limit}&skip=${skip}`,
    ),

  getById: (expenseId: string) =>
    apiFetch<{ expense: any }>(`/expenses/${expenseId}`),

  create: (payload: CreateExpensePayload) =>
    apiFetch<{ expense: any }>('/expenses', 'POST', toApiPayload(payload)),

  update: (expenseId: string, patch: UpdateExpensePatch) =>
    apiFetch<{ expense: any }>(`/expenses/${expenseId}`, 'PATCH', toApiPayload(patch)),

  delete: (expenseId: string) =>
    apiFetch<{ message: string; expenseId: string }>(`/expenses/${expenseId}`, 'DELETE'),

  scanReceipt: (imageBase64: string) =>
    apiFetch<{ items: any[] }>('/expenses/scan-receipt', 'POST', { image: imageBase64 }),
};
