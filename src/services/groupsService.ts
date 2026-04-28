import { apiFetch } from './api';
import { Group, GroupMember, GroupBalancesData } from '../types';

export interface GroupMyBalance {
  net: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  topDebts: { userId: string; name: string; net: number }[];
}

export interface ApiGroup {
  _id: string;
  name: string;
  members: GroupMember[];
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  type?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  simplifyDebts?: boolean;
  myBalance?: GroupMyBalance;
}

export interface ApiExpenseItem {
  _id: string;
  groupId: string;
  payerId: string;
  amount: number;
  currency: string;
  notes: string;
  date: string;
  splitMethod: string;
  splitDetails: Record<string, number>;
}

/** Map an API group response to the local store Group shape */
export const apiGroupToGroup = (g: ApiGroup): Group => ({
  id: g._id,
  name: g.name,
  members: g.members.map(m => m._id),
  createdBy: g.createdBy?._id ?? '',
  createdAt: g.createdAt,
  type: g.type as Group['type'],
  image: g.image,
  startDate: g.startDate,
  endDate: g.endDate,
  simplifyDebts: g.simplifyDebts,
});

export interface GroupUpdatePatch {
  name?: string;
  type?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  simplifyDebts?: boolean;
}

export const groupsService = {
  create: (name: string, memberIds: string[] = []) =>
    apiFetch<{ group: ApiGroup }>('/groups', 'POST', { name, memberIds }),

  getAll: () =>
    apiFetch<{ groups: ApiGroup[] }>('/groups'),

  getGroup: (groupId: string) =>
    apiFetch<{ group: ApiGroup }>(`/groups/${groupId}`),

  getBalances: (groupId: string) =>
    apiFetch<GroupBalancesData>(`/groups/${groupId}/balances`),

  getExpenses: (groupId: string, limit = 30, skip = 0) =>
    apiFetch<{ expenses: ApiExpenseItem[]; total: number; hasMore: boolean }>(
      `/groups/${groupId}/expenses?limit=${limit}&skip=${skip}`,
    ),

  leave: (groupId: string) =>
    apiFetch(`/groups/${groupId}/leave`, 'POST'),

  settle: (groupId: string, payload: { payerId: string; receiverId: string; amount: number; currency?: string }) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/groups/${groupId}/settle`, 'POST', payload),

  update: (groupId: string, patch: GroupUpdatePatch) =>
    apiFetch<{ group: ApiGroup }>(`/groups/${groupId}`, 'PATCH', patch),

  /** @deprecated use update() */
  rename: (groupId: string, name: string) =>
    apiFetch<{ group: ApiGroup }>(`/groups/${groupId}`, 'PATCH', { name }),

  addMember: (groupId: string, userId: string) =>
    apiFetch<{ group: ApiGroup }>(`/groups/${groupId}/members`, 'POST', { userId }),

  removeMember: (groupId: string, userId: string) =>
    apiFetch<{ group: ApiGroup }>(`/groups/${groupId}/members/${userId}`, 'DELETE'),

  deleteGroup: (groupId: string) =>
    apiFetch(`/groups/${groupId}`, 'DELETE'),
};

export const expensesService = {
  update: (expenseId: string, patch: Partial<Pick<ApiExpenseItem, 'amount' | 'notes' | 'currency' | 'splitMethod' | 'splitDetails'>>) =>
    apiFetch<{ expense: ApiExpenseItem }>(`/expenses/${expenseId}`, 'PATCH', patch),

  delete: (expenseId: string) =>
    apiFetch(`/expenses/${expenseId}`, 'DELETE'),
};
