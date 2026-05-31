import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type { AnalyticsSummary } from '../services/analyticsService';

const ANALYTICS_KEY = 'analytics';

export function useAnalytics(friendId?: string) {
  return useQuery<AnalyticsSummary>({
    queryKey: [ANALYTICS_KEY, 'summary', friendId || 'global'],
    queryFn: () => analyticsService.getSummary(friendId),
  });
}
