import { apiFetch } from './api';
import { ActivityEntry } from '../types';

export const activitiesService = {
  getAll: (limit = 30) =>
    apiFetch<{ activities: ActivityEntry[] }>(`/activities?limit=${limit}`),
};
