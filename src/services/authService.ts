import { apiFetch } from './api';
import { CurrentUser } from '../types';

interface RawUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  bio?: string;
  profilePic?: string;
  currency?: string;
}

interface AuthResponse {
  token: string;
  user: RawUser;
}

export const normalize = (u: RawUser): CurrentUser => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  country: u.country,
  bio: u.bio,
  profilePic: u.profilePic,
  currency: u.currency,
});

export const authService = {
  register: async (name: string, email: string, password: string, phone?: string) => {
    const data = await apiFetch<AuthResponse>('/auth/register', 'POST', { name, email, password, phone });
    return { token: data.token, user: normalize(data.user) };
  },

  login: async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', 'POST', { email, password });
    return { token: data.token, user: normalize(data.user) };
  },

  me: async (): Promise<CurrentUser> => {
    const data = await apiFetch<{ user: RawUser }>('/auth/me');
    return normalize(data.user);
  },

  updateProfile: async (payload: {
    name?: string;
    phone?: string;
    bio?: string;
    currency?: string;
    profilePic?: string;
    email?: string;
    newPassword?: string;
  }): Promise<CurrentUser> => {
    const data = await apiFetch<{ user: RawUser }>('/auth/profile', 'PUT', payload);
    return normalize(data.user);
  },

  // Phone auth: exchange Firebase ID token for our JWT
  phoneLogin: async (idToken: string, name?: string, country?: string) => {
    const data = await apiFetch<AuthResponse>('/auth/phone', 'POST', { idToken, name, country });
    return { token: data.token, user: normalize(data.user) };
  },

  clearAllData: () => apiFetch('/data', 'DELETE'),

  deleteAccount: () => apiFetch('/auth/account', 'DELETE'),
};
