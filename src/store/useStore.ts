import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Bill, Group, ActivityEntry } from '../types';

interface AppState {
  expenses: Expense[];
  bills: Bill[];
  groups: Group[];
  activities: ActivityEntry[];
  isGuest: boolean;

  addExpense: (expense: Expense) => void;
  addBill: (bill: Bill) => void;
  addGroup: (group: Group) => void;
  markBillHandled: (id: string) => void;
  setGuestStatus: (status: boolean) => void;
  clearData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    set => ({
      expenses: [],
      bills: [],
      groups: [],
      activities: [],
      isGuest: false,

      addExpense: expense =>
        set(state => ({
          expenses: [expense, ...state.expenses],
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Added Expense',
              detail: expense.notes || `$${expense.amount.toFixed(2)}`,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      addBill: bill =>
        set(state => ({
          bills: [bill, ...state.bills],
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Added Bill',
              detail: `${bill.title} — $${bill.amount.toFixed(2)}`,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      addGroup: group =>
        set(state => ({
          groups: [group, ...state.groups],
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Created Group',
              detail: group.name,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      markBillHandled: id =>
        set(state => {
          const bill = state.bills.find(b => b.id === id);
          return {
            bills: state.bills.map(b =>
              b.id === id ? { ...b, status: 'handled' } : b,
            ),
            activities: [
              {
                id: `act-${Date.now()}`,
                action: 'Bill Handled',
                detail: bill ? bill.title : id,
                timestamp: new Date().toISOString(),
              },
              ...state.activities,
            ],
          };
        }),

      setGuestStatus: status => set({ isGuest: status }),

      clearData: () =>
        set({ expenses: [], bills: [], groups: [], activities: [], isGuest: false }),
    }),
    {
      name: 'fin-coord-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Balance Calculation Selector
 * Returns net balance per person: positive = owed money, negative = owes money.
 * Supports equal, percentage, and custom splits.
 */
export const useBalances = (groupId: string) => {
  const expenses = useStore(state =>
    state.expenses.filter(e => e.groupId === groupId),
  );

  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const participants = Object.keys(expense.splitDetails);
    if (participants.length === 0) continue;

    balances[expense.payerId] = (balances[expense.payerId] || 0) + expense.amount;

    if (expense.splitMethod === 'equal') {
      const share = expense.amount / participants.length;
      for (const userId of participants) {
        balances[userId] = (balances[userId] || 0) - share;
      }
    } else if (expense.splitMethod === 'percentage') {
      for (const [userId, pct] of Object.entries(expense.splitDetails)) {
        balances[userId] = (balances[userId] || 0) - (expense.amount * pct) / 100;
      }
    } else {
      for (const [userId, amt] of Object.entries(expense.splitDetails)) {
        balances[userId] = (balances[userId] || 0) - amt;
      }
    }
  }

  return balances;
};
