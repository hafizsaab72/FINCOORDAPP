import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Bill, Group, ActivityEntry, CurrentUser } from '../types';

interface AppState {
  expenses: Expense[];
  bills: Bill[];
  groups: Group[];
  activities: ActivityEntry[];
  isGuest: boolean;
  currency: string;
  currentUser: CurrentUser | null;
  token: string | null;

  addExpense: (expense: Expense) => void;
  addBill: (bill: Bill) => void;
  addGroup: (group: Group) => void;
  markBillHandled: (id: string) => void;
  setGuestStatus: (status: boolean) => void;
  setCurrency: (code: string) => void;
  setAuth: (user: CurrentUser, token: string) => void;
  updateCurrentUser: (patch: Partial<CurrentUser>) => void;
  signOut: () => void;
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
      currency: 'USD',
      currentUser: null,
      token: null,

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

      setCurrency: code => set({ currency: code }),

      setAuth: (user, token) => set({ currentUser: user, token, isGuest: false }),

      updateCurrentUser: patch =>
        set(state => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...patch } : state.currentUser,
        })),

      signOut: () => set({ currentUser: null, token: null, isGuest: false }),

      clearData: () =>
        set({ expenses: [], bills: [], groups: [], activities: [] }),
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
 */
export const useBalances = (groupId: string) => {
  const allExpenses = useStore(state => state.expenses);
  const expenses = allExpenses.filter(e => e.groupId === groupId);

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
