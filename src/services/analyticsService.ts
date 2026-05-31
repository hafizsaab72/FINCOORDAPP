import { apiFetch } from './api';

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopPayer {
  payerId: string;
  amount: number;
}

export interface AnalyticsSummary {
  totalSpent: number;
  yourShare: number;
  expenseCount: number;
  categoryBreakdown: CategoryBreakdown[];
  topPayers: TopPayer[];
}

export const analyticsService = {
  getSummary: (friendId?: string) =>
    apiFetch<AnalyticsSummary>(
      `/analytics/summary${friendId ? `?friendId=${friendId}` : ''}`,
    ),
};
