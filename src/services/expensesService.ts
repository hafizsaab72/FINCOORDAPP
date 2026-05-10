import { apiFetch } from './api';
import { Payment, SplitEntry, SplitType } from '../types';

export interface CreateExpensePayload {
  groupId?: string;
  description: string;
  totalAmount: number; // minor units
  baseCurrency: string;
  payments: Payment[];
  splits: SplitEntry[];
  splitType: SplitType;
  notes?: string;
  date?: string;
}

export interface UpdateExpensePayload {
  totalAmount?: number;
  notes?: string;
  description?: string;
  baseCurrency?: string;
  splitType?: SplitType;
  payments?: Payment[];
  splits?: SplitEntry[];
  date?: string;
}

export interface ApiExpenseItem {
  _id: string;
  groupId?: string;
  directParticipants?: string[];
  description: string;
  totalAmount: number; // minor units
  baseCurrency: string;
  payments: { userId: string; amount: number; originalCurrency?: string; exchangeRate?: number }[];
  splits: { userId: string; owedAmount: number; shareType?: string; shareValue?: number; isExcluded?: boolean }[];
  splitType: string;
  expenseDate: string;
  notes?: string;
  category?: string;
  receiptUrl?: string;
  isSettlement?: boolean;
  createdBy?: string;
  currency?: string; // legacy
}

import { toMinorUnits } from '../utils/currency';

export const expensesService = {
  getByGroup: (groupId: string, limit = 30, skip = 0) =>
    apiFetch<{ expenses: ApiExpenseItem[]; total: number; hasMore: boolean }>(
      `/expenses?groupId=${groupId}&limit=${limit}&skip=${skip}`,
    ),

  getById: (expenseId: string) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/expenses/${expenseId}`),

  create: (payload: CreateExpensePayload) =>
    apiFetch<{ expense: ApiExpenseItem }>('/expenses', 'POST', payload),

  update: (expenseId: string, patch: UpdateExpensePayload) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/expenses/${expenseId}`, 'PATCH', patch),

  delete: (expenseId: string) =>
    apiFetch<{ message: string }>(`/expenses/${expenseId}`, 'DELETE'),
};
