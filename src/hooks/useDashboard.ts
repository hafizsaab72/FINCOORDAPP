import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import type { DashboardBalances } from '../types';

const DASHBOARD_KEY = 'dashboard';

export function useGlobalBalances() {
  return useQuery<DashboardBalances>({
    queryKey: [DASHBOARD_KEY, 'balances'],
    queryFn: () => dashboardService.getBalances(),
  });
}
