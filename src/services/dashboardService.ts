import { apiFetch } from './api';
import { DashboardBalances } from '../types';

export const dashboardService = {
  getBalances: () =>
    apiFetch<DashboardBalances>('/dashboard/balances'),
};
