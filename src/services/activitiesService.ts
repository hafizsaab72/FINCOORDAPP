import { apiFetch } from './api';
import { Activity } from '../types';

function transformActivity(a: any): Activity {
  return {
    id: a._id || a.id,
    action: a.action,
    detail: a.detail,
    timestamp: a.timestamp,
    expenseId: a.expenseId,
    groupId: a.groupId,
    amount: a.amount,
    currency: a.currency,
    metadata: a.metadata,
  };
}

export const activitiesService = {
  getAll: async (limit = 30): Promise<{ activities: Activity[] }> => {
    const res = await apiFetch<{ activities: any[] }>(`/activities?limit=${limit}`);
    return { activities: res.activities.map(transformActivity) };
  },
};
