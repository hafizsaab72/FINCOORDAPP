import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Bill, Group, ActivityEntry, CurrentUser, SplitTemplate } from '../types';
import { cancelBillReminder } from '../utils/notifications';

interface AppState {
  expenses: Expense[];
  bills: Bill[];
  groups: Group[];
  activities: ActivityEntry[];
  isGuest: boolean;
  currency: string;
  currentUser: CurrentUser | null;
  token: string | null;
  isPro: boolean;
  splitTemplates: Record<string, SplitTemplate>;
  exchangeRates: Record<string, number>;
  ratesLastFetched: number;

  _hasHydrated: boolean;

  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void;
  deleteExpense: (id: string) => void;
  addBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  updateBill: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void;
  setBills: (bills: Bill[]) => void;
  addGroup: (group: Group) => void;
  setGroups: (groups: Group[]) => void;
  updateGroup: (id: string, patch: Partial<Omit<Group, 'id'>>) => void;
  removeGroup: (id: string) => void;
  markBillHandled: (id: string) => void;
  setGuestStatus: (status: boolean) => void;
  setCurrency: (code: string) => void;
  setAuth: (user: CurrentUser, token: string) => void;
  updateCurrentUser: (patch: Partial<CurrentUser>) => void;
  signOut: () => void;
  clearData: () => void;
  setIsPro: (value: boolean) => void;
  setSplitTemplate: (template: SplitTemplate) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
  recomputeBillStatuses: () => void;
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
      isPro: false,
      splitTemplates: {},
      exchangeRates: {},
      ratesLastFetched: 0,
      _hasHydrated: false,

      addExpense: expense =>
        set(state => ({
          expenses: [expense, ...state.expenses],
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Added Expense',
              detail: expense.notes || `${expense.currency ?? ''} ${expense.amount.toFixed(2)}`.trim(),
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      updateExpense: (id, patch) =>
        set(state => ({
          expenses: state.expenses.map(e => e.id === id ? { ...e, ...patch } : e),
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Edited Expense',
              detail: patch.notes || `${patch.currency ?? ''} ${(patch.amount ?? 0).toFixed(2)}`.trim(),
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      deleteExpense: id =>
        set(state => ({
          expenses: state.expenses.filter(e => e.id !== id),
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Deleted Expense',
              detail: id,
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
              detail: `${bill.title} — ${bill.currency ?? ''}${bill.amount.toFixed(2)}`.trim(),
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        })),

      deleteBill: id => {
        cancelBillReminder(id);
        set(state => ({
          bills: state.bills.filter(b => b.id !== id),
          activities: [
            {
              id: `act-${Date.now()}`,
              action: 'Deleted Bill',
              detail: id,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ],
        }));
      },

      updateBill: (id, patch) =>
        set(state => ({
          bills: state.bills.map(b => b.id === id ? { ...b, ...patch } : b),
        })),

      setBills: bills => set({ bills }),

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

      setGroups: groups => set({ groups }),

      updateGroup: (id, patch) =>
        set(state => ({
          groups: state.groups.map(g => g.id === id ? { ...g, ...patch } : g),
        })),

      removeGroup: id =>
        set(state => ({
          groups: state.groups.filter(g => g.id !== id),
          expenses: state.expenses.filter(e => e.groupId !== id),
        })),

      markBillHandled: id => {
        cancelBillReminder(id);
        set(state => {
          const bill = state.bills.find(b => b.id === id);
          return {
            bills: state.bills.map(b =>
              b.id === id ? { ...b, status: 'handled' as const } : b,
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
        });
      },

      setGuestStatus: status => set({ isGuest: status }),

      setCurrency: code => set({ currency: code }),

      setAuth: (user, token) =>
        set(state => {
          const switchingUser = state.currentUser?.id !== user.id;
          const wasGuest = state.isGuest;
          // If coming from guest mode, preserve local data
          if (wasGuest && switchingUser) {
            return {
              currentUser: user,
              token,
              isGuest: false,
            };
          }
          return {
            currentUser: user,
            token,
            isGuest: false,
            // Clear previous user's local data whenever a different (or new) user signs in
            ...(switchingUser
              ? {
                  expenses: [],
                  bills: [],
                  groups: [],
                  activities: [],
                  splitTemplates: {},
                  exchangeRates: {},
                  ratesLastFetched: 0,
                }
              : {}),
          };
        }),

      updateCurrentUser: patch =>
        set(state => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...patch } : state.currentUser,
        })),

      signOut: () =>
        set({
          currentUser: null,
          token: null,
          isGuest: false,
          expenses: [],
          bills: [],
          groups: [],
          activities: [],
          splitTemplates: {},
          exchangeRates: {},
          ratesLastFetched: 0,
        }),

      clearData: () =>
        set({ expenses: [], bills: [], groups: [], activities: [] }),

      setIsPro: value => set({ isPro: value }),

      setSplitTemplate: template =>
        set(state => ({
          splitTemplates: { ...state.splitTemplates, [template.groupId]: template },
        })),

      setExchangeRates: rates => set({ exchangeRates: rates, ratesLastFetched: Date.now() }),

      recomputeBillStatuses: () =>
        set(state => {
          const now = new Date();
          const updatedBills = state.bills.map(b => {
            if (b.status === 'pending' && new Date(b.dueDate) < now) {
              return { ...b, status: 'overdue' as const };
            }
            return b;
          });
          return { bills: updatedBills };
        }),
    }),
    {
      name: 'fin-coord-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        expenses: state.expenses,
        bills: state.bills,
        groups: state.groups,
        activities: state.activities,
        isGuest: state.isGuest,
        currency: state.currency,
        currentUser: state.currentUser,
        token: state.token,
        isPro: state.isPro,
        splitTemplates: state.splitTemplates,
        exchangeRates: state.exchangeRates,
        ratesLastFetched: state.ratesLastFetched,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ _hasHydrated: true });
        // Recompute overdue statuses after hydration
        setTimeout(() => {
          useStore.getState().recomputeBillStatuses();
        }, 0);
      },
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

    // Always credit the payer regardless of splitDetails
    balances[expense.payerId] = (balances[expense.payerId] || 0) + expense.amount;

    if (participants.length === 0) continue;

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
