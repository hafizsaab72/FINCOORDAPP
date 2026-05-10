import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesService } from '../services/expensesService';

const EXPENSES_KEY = 'expenses';

export function useGroupExpenses(groupId: string, limit = 30, skip = 0) {
  return useQuery({
    queryKey: [EXPENSES_KEY, groupId, limit, skip],
    queryFn: () => expensesService.getByGroup(groupId, limit, skip),
    enabled: !!groupId,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesService.create,
    onSuccess: (_data, variables) => {
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY, variables.groupId] });
        queryClient.invalidateQueries({ queryKey: ['balances', variables.groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof expensesService.update>[1] }) =>
      expensesService.update(id, patch),
    onSuccess: (_data, variables) => {
      // We don't know the groupId here, so invalidate broadly
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => expensesService.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
