import { apiFetch } from './api';

export interface FriendUser {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
}

export interface FriendRequest {
  _id: string;
  sender: FriendUser;
  receiver: FriendUser;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BalanceBreakdown {
  groupId: string;
  groupName: string;
  amount: number;
  direction: 'owes_you' | 'you_owe';
}

export interface FriendBalance {
  friendId: string;
  name: string;
  email: string;
  profilePic?: string;
  netBalance: number; // positive = they owe me, negative = I owe them
  breakdown: BalanceBreakdown[];
}

export interface BalanceSummary {
  totalOwedToYou: number;
  totalYouOwe: number;
  friends: FriendBalance[];
}

export const friendsService = {
  search: (q: string, includeFriends = false) =>
    apiFetch<{ users: FriendUser[] }>(
      `/users/search?q=${encodeURIComponent(q)}${includeFriends ? '&includeFriends=true' : ''}`,
    ),

  getInviteUser: (userId: string) =>
    apiFetch<{ user: FriendUser }>(`/users/invite/${userId}`),

  getFriends: () =>
    apiFetch<{ friends: FriendUser[] }>('/friends'),

  getBalances: () =>
    apiFetch<BalanceSummary>('/friends/balances'),

  getRequests: () =>
    apiFetch<{ requests: FriendRequest[] }>('/friends/requests'),

  getSentRequests: () =>
    apiFetch<{ requests: FriendRequest[] }>('/friends/requests/sent'),

  remind: (friendId: string) =>
    apiFetch<{ sent: boolean }>(`/friends/${friendId}/remind`, 'POST'),

  sendRequest: (userId: string) =>
    apiFetch(`/friends/request/${userId}`, 'POST'),

  accept: (requestId: string) =>
    apiFetch(`/friends/accept/${requestId}`, 'PUT'),

  reject: (requestId: string) =>
    apiFetch(`/friends/reject/${requestId}`, 'PUT'),

  remove: (friendId: string) =>
    apiFetch(`/friends/${friendId}`, 'DELETE'),

  matchContacts: (phones: string[], emails: string[]) =>
    apiFetch<{ users: FriendUser[] }>('/users/match-contacts', 'POST', { phones, emails }),
};
