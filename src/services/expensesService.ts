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

function convertToMinorUnits(payload: CreateExpensePayload): CreateExpensePayload {
  return {
    ...payload,
    totalAmount: toMinorUnits(payload.totalAmount),
    payments: payload.payments.map(p => ({
      ...p,
      amount: toMinorUnits(p.amount),
    })),
    splits: payload.splits.map(s => ({
      ...s,
      owedAmount: toMinorUnits(s.owedAmount),
    })),
  };
}

function convertPatchToMinorUnits(patch: UpdateExpensePayload): UpdateExpensePayload {
  return {
    ...patch,
    totalAmount: patch.totalAmount !== undefined ? toMinorUnits(patch.totalAmount) : undefined,
    payments: patch.payments?.map(p => ({
      ...p,
      amount: toMinorUnits(p.amount),
    })),
    splits: patch.splits?.map(s => ({
      ...s,
      owedAmount: toMinorUnits(s.owedAmount),
    })),
  };
}

export const expensesService = {
  getByGroup: (groupId: string, limit = 30, skip = 0) =>
    apiFetch<{ expenses: ApiExpenseItem[]; total: number; hasMore: boolean }>(
      `/expenses?groupId=${groupId}&limit=${limit}&skip=${skip}`,
    ),

  getById: (expenseId: string) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/expenses/${expenseId}`),

  create: (payload: CreateExpensePayload) =>
    apiFetch<{ expense: ApiExpenseItem }>('/expenses', 'POST', convertToMinorUnits(payload)),

  update: (expenseId: string, patch: UpdateExpensePayload) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/expenses/${expenseId}`, 'PATCH', convertPatchToMinorUnits(patch)),

  delete: (expenseId: string) =>
    apiFetch<{ message: string }>(`/expenses/${expenseId}`, 'DELETE'),
};
