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

export const friendsService = {
  search: (q: string) =>
    apiFetch<{ users: FriendUser[] }>(`/users/search?q=${encodeURIComponent(q)}`),

  getInviteUser: (userId: string) =>
    apiFetch<{ user: FriendUser }>(`/users/invite/${userId}`),

  getFriends: () =>
    apiFetch<{ friends: FriendUser[] }>('/friends'),

  getRequests: () =>
    apiFetch<{ requests: FriendRequest[] }>('/friends/requests'),

  sendRequest: (userId: string) =>
    apiFetch(`/friends/request/${userId}`, 'POST'),

  accept: (requestId: string) =>
    apiFetch(`/friends/accept/${requestId}`, 'PUT'),

  reject: (requestId: string) =>
    apiFetch(`/friends/reject/${requestId}`, 'PUT'),

  remove: (friendId: string) =>
    apiFetch(`/friends/${friendId}`, 'DELETE'),
};
