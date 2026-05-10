import { useQuery } from '@tanstack/react-query';
import { groupsService } from '../services/groupsService';
import type { GroupBalancesData } from '../types';

const BALANCES_KEY = 'balances';

export function useGroupBalances(groupId: string) {
  return useQuery<GroupBalancesData>({
    queryKey: [BALANCES_KEY, groupId],
    queryFn: () => groupsService.getBalances(groupId),
    enabled: !!groupId,
  });
}
