import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrentUser } from '../types';

const STORAGE_KEY = 'fin-coord-storage';

interface AppState {
  currency: string;
  currentUser: CurrentUser | null;
  token: string | null;
  isPro: boolean;
  exchangeRates: Record<string, number>;
  ratesLastFetched: number;

  _hasHydrated: boolean;

  setCurrency: (code: string) => void;
  setAuth: (user: CurrentUser, token: string) => void;
  updateCurrentUser: (patch: Partial<CurrentUser>) => void;
  signOut: () => void;
  setIsPro: (value: boolean) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
}

export const useStore = create<AppState>()(
  persist(
    set => ({
      currency: 'USD',
      currentUser: null,
      token: null,
      isPro: false,
      exchangeRates: {},
      ratesLastFetched: 0,
      _hasHydrated: false,

      setCurrency: code => set({ currency: code }),

      setAuth: (user, token) =>
        set(state => {
          const switchingUser = state.currentUser?.id !== user.id;
          return {
            currentUser: user,
            token,
            exchangeRates: switchingUser ? {} : state.exchangeRates,
            ratesLastFetched: switchingUser ? 0 : state.ratesLastFetched,
          };
        }),

      updateCurrentUser: patch =>
        set(state => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...patch } : state.currentUser,
        })),

      signOut: () => {
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        set({
          currentUser: null,
          token: null,
          exchangeRates: {},
          ratesLastFetched: 0,
        });
      },

      setIsPro: value => set({ isPro: value }),

      setExchangeRates: rates => set({ exchangeRates: rates, ratesLastFetched: Date.now() }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        currency: state.currency,
        currentUser: state.currentUser,
        token: state.token,
        isPro: state.isPro,
        exchangeRates: state.exchangeRates,
        ratesLastFetched: state.ratesLastFetched,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ _hasHydrated: true });
      },
    },
  ),
);
