import React, { useReducer, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import {
  Expense,
  Participant,
  Payer,
  Split,
  SplitMethod,
  GroupMember,
} from '../types';
import { expensesService } from '../services/expensesService';
import { groupsService } from '../services/groupsService';
import { friendsService, FriendUser } from '../services/friendsService';
import { getSymbol } from '../utils/currency';
import { validateExpense } from '../utils/expenseValidation';
import { queryClient } from '../../App';
import { apiExpenseToLocal } from '../utils/balances';
import ParticipantSelector from '../components/ParticipantSelector';
import PayerSelector from '../components/PayerSelector';
import SplitConfigurator from '../components/SplitConfigurator';
import CategoryPicker from '../components/CategoryPicker';
import CurrencySelector from '../components/CurrencySelector';
import DatePickerField from '../components/DatePickerField';
import ExpenseSummaryBar from '../components/ExpenseSummaryBar';
import AppAvatar from '../components/AppAvatar';

// ─── Form State ───────────────────────────────────────────────────────────

interface FormState {
  title: string;
  totalAmount: number;
  currency: string;
  contextType: 'group' | 'non_group';
  selectedGroupId: string | null;
  participants: Participant[];
  payerMode: 'single' | 'multiple';
  payers: Payer[];
  splitMethod: SplitMethod;
  splits: Split[];
  date: string;
  notes: string;
  category: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

type FormAction =
  | { type: 'INIT'; payload: Partial<FormState> }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_AMOUNT'; amount: number }
  | { type: 'SET_CURRENCY'; currency: string }
  | { type: 'SET_CONTEXT_TYPE'; contextType: 'group' | 'non_group' }
  | { type: 'SELECT_GROUP'; groupId: string; members: GroupMember[] }
  | { type: 'SET_PARTICIPANTS'; participants: Participant[] }
  | { type: 'SET_PAYER_MODE'; mode: 'single' | 'multiple' }
  | { type: 'SET_PAYERS'; payers: Payer[] }
  | { type: 'SET_SPLIT_METHOD'; method: SplitMethod }
  | { type: 'SET_SPLITS'; splits: Split[] }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_CATEGORY'; category: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SAVING'; saving: boolean }
  | { type: 'SET_ERROR'; error: string | null };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'INIT': {
      // Ensure a single payer always has amountPaid = totalAmount when mode is single.
      let payers = action.payload.payers ?? [];
      const mode = action.payload.payerMode ?? state.payerMode ?? 'single';
      const totalAmount = action.payload.totalAmount ?? 0;
      if (mode === 'single' && payers.length === 1 && totalAmount > 0) {
        payers = [{ ...payers[0], amountPaid: totalAmount }];
      }
      return {
        ...state,
        ...action.payload,
        payerMode: mode,
        payers,
        totalAmount,
      };
    }
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_AMOUNT': {
      const newTotal = action.amount;
      const activeParticipants = state.participants.filter(p => p.isActive);
      const n = activeParticipants.length;

      // Recompute equal-split computedAmounts when amount changes.
      // Handles both: splits=[] (friends/non-group flow) and splits populated (group flow).
      let newSplits = state.splits;
      if (state.splitMethod === 'equal' && n > 0 && newTotal > 0) {
        const share = Math.floor((newTotal / n) * 100) / 100;
        const remainder = Math.round((newTotal - share * n) * 100) / 100;

        if (state.splits.length === 0) {
          // Friends flow: generate splits from activeParticipants directly.
          let remainderUsed = false;
          newSplits = activeParticipants.map(p => {
            const amount = remainderUsed
              ? share
              : Math.round((share + remainder) * 100) / 100;
            remainderUsed = true;
            return {
              userId: p.userId,
              splitMethod: 'equal' as SplitMethod,
              value: 1,
              computedAmount: amount,
              isActive: true,
            };
          });
        } else {
          // Group flow: update computedAmount on existing split entries.
          let remainderUsed = false;
          newSplits = state.splits.map(s => {
            const isActive = activeParticipants.some(
              p => p.userId === s.userId,
            );
            if (!isActive) return { ...s, computedAmount: 0 };
            const amount = remainderUsed
              ? share
              : Math.round((share + remainder) * 100) / 100;
            remainderUsed = true;
            return { ...s, computedAmount: amount };
          });
        }
      }

      // In single-payer mode, sync the sole payer's amountPaid with the total.
      // In multiple-payer mode leave payers unchanged — user manually enters each amount.
      if (state.payerMode === 'single' && state.payers.length === 1) {
        return {
          ...state,
          totalAmount: newTotal,
          splits: newSplits,
          payers: [{ ...state.payers[0], amountPaid: newTotal }],
        };
      }
      return { ...state, totalAmount: newTotal, splits: newSplits };
    }
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency };
    case 'SET_CONTEXT_TYPE':
      return { ...state, contextType: action.contextType };
    case 'SELECT_GROUP': {
      const activeParticipants = action.members.map(m => ({
        userId: m._id,
        name: m.name,
        isActive: true,
      }));
      const n = activeParticipants.length;
      const totalAmount = state.totalAmount;

      // Compute equal split amounts inline so they're ready immediately.
      const share = n > 0 ? Math.floor((totalAmount / n) * 100) / 100 : 0;
      const remainder =
        n > 0 ? Math.round((totalAmount - share * n) * 100) / 100 : 0;
      let remainderUsed = false;

      const newSplits: Split[] = activeParticipants.map(p => {
        const amount = remainderUsed
          ? share
          : Math.round((share + remainder) * 100) / 100;
        remainderUsed = true;
        return {
          userId: p.userId,
          splitMethod: 'equal',
          value: 1,
          computedAmount: amount,
        };
      });

      const payers: Payer[] = [
        {
          userId: activeParticipants[0]?.userId ?? '',
          amountPaid: totalAmount,
        },
      ];

      return {
        ...state,
        selectedGroupId: action.groupId,
        participants: activeParticipants,
        payers,
        splits: newSplits,
        contextType: 'group',
      };
    }
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.participants };
    case 'SET_PAYER_MODE':
      return { ...state, payerMode: action.mode };
    case 'SET_PAYERS':
      return { ...state, payers: action.payers };
    case 'SET_SPLIT_METHOD': {
      const activeParticipants = state.participants.filter(p => p.isActive);
      const n = activeParticipants.length;
      const totalAmount = state.totalAmount;

      let newValues: Record<string, number> = {};
      let newComputed: Record<string, number> = {};

      if (action.method === 'equal') {
        // Compute equal shares: floor each, first person absorbs rounding remainder.
        const share = n > 0 ? Math.floor((totalAmount / n) * 100) / 100 : 0;
        const remainder =
          n > 0 ? Math.round((totalAmount - share * n) * 100) / 100 : 0;
        let remainderUsed = false;
        for (const p of activeParticipants) {
          newValues[p.userId] = 1;
          const amount = remainderUsed
            ? share
            : Math.round((share + remainder) * 100) / 100;
          newComputed[p.userId] = amount;
          remainderUsed = true;
        }
      } else if (action.method === 'exact') {
        // Carry forward current computed amounts so user can tweak them.
        for (const s of state.splits) {
          newValues[s.userId] = s.computedAmount;
          newComputed[s.userId] = s.computedAmount;
        }
      } else if (action.method === 'percentage') {
        // Default to equal split (100/n % each) with computed amounts.
        for (const p of activeParticipants) {
          const pct = n > 0 ? 100 / n : 0;
          newValues[p.userId] = pct;
          newComputed[p.userId] = (pct / 100) * totalAmount;
        }
      } else if (action.method === 'shares') {
        // Default to 1 share each with proportional computed amounts.
        let totalShares = 0;
        for (const p of activeParticipants) {
          const shares = 1;
          totalShares += shares;
          newValues[p.userId] = shares;
        }
        for (const p of activeParticipants) {
          newComputed[p.userId] =
            totalShares > 0
              ? (newValues[p.userId] / totalShares) * totalAmount
              : 0;
        }
      } else if (action.method === 'adjustment') {
        // Default to 0 adjustment — each pays base equal share.
        const basePerPerson = n > 0 ? totalAmount / n : 0;
        for (const p of activeParticipants) {
          newValues[p.userId] = 0;
          newComputed[p.userId] = basePerPerson;
        }
      }

      // Build splits with .value (input) and .computedAmount (display) both populated.
      const newSplits = activeParticipants.map(p => ({
        userId: p.userId,
        splitMethod: action.method as SplitMethod,
        value: newValues[p.userId] ?? 0,
        computedAmount: newComputed[p.userId] ?? 0,
      }));
      return { ...state, splitMethod: action.method, splits: newSplits };
    }
    case 'SET_SPLITS':
      return { ...state, splits: action.splits };
    case 'SET_DATE':
      return { ...state, date: action.date };
    case 'SET_NOTES':
      return { ...state, notes: action.notes };
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_SAVING':
      return { ...state, saving: action.saving };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

function getInitialState(currency: string): FormState {
  const today = new Date().toISOString();
  return {
    title: '',
    totalAmount: 0,
    currency,
    contextType: 'non_group',
    selectedGroupId: null,
    participants: [],
    payerMode: 'single',
    payers: [],
    splitMethod: 'equal',
    splits: [],
    date: today,
    notes: '',
    category: 'general',
    loading: false,
    saving: false,
    error: null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AddExpenseScreen({ navigation, route }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const currentUser = useStore(s => s.currentUser);
  const storeCurrency = useStore(s => s.currency);

  const groupIdParam: string | undefined = route?.params?.groupId;
  const friendIdParam: string | undefined = route?.params?.friendId;
  const friendNameParam: string | undefined = route?.params?.friendName;
  const expenseIdParam: string | undefined = route?.params?.expenseId;
  const isSettlementParam: boolean = route?.params?.isSettlement ?? false;

  const [state, dispatch] = useReducer(
    formReducer,
    getInitialState(storeCurrency),
  );
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupDetail, setGroupDetail] = useState<any>(null);

  // Helper: fill missing participant names from available data
  const fillParticipantNames = (participants: Participant[]): Participant[] => {
    const meId = currentUser?.id ?? 'me';
    const meName = currentUser?.name ?? 'You';
    return participants.map(p => {
      if (p.name && p.name.trim().length > 0) return p;
      if (p.userId === meId) return { ...p, name: meName };
      const friend = friends.find(f => f._id === p.userId);
      if (friend) return { ...p, name: friend.name };
      return { ...p, name: 'Friend' };
    });
  };

  // Load friends and groups on mount
  useEffect(() => {
    friendsService
      .getFriends()
      .then(res => {
        setFriends(res.friends || []);
      })
      .catch(() => {
        // no friends from API
      });
    groupsService
      .getAll()
      .then(res => {
        setGroups(
          (res.groups || []).map((g: any) => ({ id: g._id, name: g.name })),
        );
      })
      .catch(() => {
        // no groups from API
      });
  }, []);

  // Initialize from params
  useEffect(() => {
    if (groupIdParam) {
      dispatch({ type: 'SET_LOADING', loading: true });
      groupsService
        .getGroup(groupIdParam)
        .then(res => {
          setGroupDetail(res.group);
          dispatch({
            type: 'SELECT_GROUP',
            groupId: groupIdParam,
            members: res.group?.members || [],
          });
          dispatch({ type: 'SET_LOADING', loading: false });
        })
        .catch(() => {
          dispatch({ type: 'SET_LOADING', loading: false });
        });
    } else if (friendIdParam) {
      const meId = currentUser?.id ?? 'me';
      const participants: Participant[] = [
        { userId: meId, name: currentUser?.name ?? 'You', isActive: true },
        {
          userId: friendIdParam,
          name: friendNameParam || 'Friend',
          isActive: true,
        },
      ];
      dispatch({
        type: 'INIT',
        payload: {
          contextType: 'non_group',
          participants,
          // payer.amountPaid stays 0 until user enters amount — SET_AMOUNT in
          // single-payer mode will then sync payer.amountPaid = totalAmount.
          payers: [{ userId: meId, amountPaid: 0 }],
        },
      });
    } else if (expenseIdParam) {
      // Edit mode: load from API.
      // Dispatch SET_AMOUNT to trigger the reducer's amount-change logic:
      //   • recomputes split computedAmounts when splitMethod === 'equal'
      //   • syncs payer.amountPaid = totalAmount in single-payer mode
      dispatch({ type: 'SET_LOADING', loading: true });
      expensesService
        .getById(expenseIdParam)
        .then(res => {
          const expense = apiExpenseToLocal(res.expense);
          dispatch({
            type: 'INIT',
            payload: {
              title: expense.title,
              totalAmount: 0, // SET_AMOUNT below will set the real total
              currency: expense.currency,
              contextType: expense.contextType,
              selectedGroupId: expense.groupId,
              participants: fillParticipantNames(expense.participants),
              payerMode: expense.payerMode,
              payers: expense.payers,
              splitMethod: expense.splitMethod,
              splits: expense.splits,
              date: expense.date,
              notes: expense.notes ?? '',
              category: expense.category,
            },
          });
          // Now fire SET_AMOUNT so it recomputes splits AND syncs payer amounts
          dispatch({ type: 'SET_AMOUNT', amount: expense.totalAmount });
          dispatch({ type: 'SET_LOADING', loading: false });
        })
        .catch(() => {
          dispatch({ type: 'SET_LOADING', loading: false });
          dispatch({ type: 'SET_ERROR', error: 'Failed to load expense' });
        });
    } else {
      // Default: non-group with just current user
      const meId = currentUser?.id ?? 'me';
      dispatch({
        type: 'INIT',
        payload: {
          participants: [
            { userId: meId, name: currentUser?.name ?? 'You', isActive: true },
          ],
          // payer.amountPaid stays 0 — SET_AMOUNT in single-payer mode will sync it.
          payers: [{ userId: meId, amountPaid: 0 }],
        },
      });
    }
  }, [
    groupIdParam,
    friendIdParam,
    expenseIdParam,
    currentUser?.id,
    currentUser?.name,
  ]);

  const handleSelectGroup = (group: any) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    groupsService
      .getGroup(group.id)
      .then(res => {
        setGroupDetail(res.group);
        dispatch({
          type: 'SELECT_GROUP',
          groupId: group.id,
          members: res.group?.members || [],
        });
        dispatch({ type: 'SET_LOADING', loading: false });
      })
      .catch(() => {
        dispatch({ type: 'SET_LOADING', loading: false });
      });
  };

  const handleToggleParticipant = (userId: string) => {
    const updated = state.participants.map(p =>
      p.userId === userId ? { ...p, isActive: !p.isActive } : p,
    );
    dispatch({ type: 'SET_PARTICIPANTS', participants: updated });
  };

  const handleAddFriendParticipant = (friend: FriendUser) => {
    const exists = state.participants.find(p => p.userId === friend._id);
    if (exists) {
      // Toggle off if already exists
      handleToggleParticipant(friend._id);
      return;
    }
    const updated = [
      ...state.participants,
      { userId: friend._id, name: friend.name, isActive: true },
    ];
    dispatch({ type: 'SET_PARTICIPANTS', participants: updated });

    // Also extend splits array to include the new participant.
    // This keeps non-equal split views (Exact, %, Shares, Adjust) in sync immediately.
    if (state.splits.length > 0) {
      const newSplit: Split = {
        userId: friend._id,
        splitMethod: state.splitMethod,
        value: 0,
        computedAmount: 0,
      };
      dispatch({ type: 'SET_SPLITS', splits: [...state.splits, newSplit] });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!expenseIdParam) return;
            dispatch({ type: 'SET_SAVING', saving: true });
            try {
              await expensesService.delete(expenseIdParam);
              await queryClient.invalidateQueries();
              navigation.goBack();
            } catch {
              dispatch({
                type: 'SET_ERROR',
                error: 'Could not delete expense. Please try again.',
              });
              dispatch({ type: 'SET_SAVING', saving: false });
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    const expenseData: Partial<Expense> = {
      title: state.title,
      totalAmount: state.totalAmount,
      currency: state.currency,
      contextType: state.contextType,
      groupId: state.contextType === 'group' ? state.selectedGroupId : null,
      participants: state.participants,
      payerMode: state.payerMode,
      payers: state.payers,
      splitMethod: state.splitMethod,
      splits: state.splits,
      date: state.date,
      notes: state.notes,
      category: state.category,
      isSettlement: isSettlementParam,
    };

    const validation = validateExpense(expenseData);
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', error: validation.errors[0] });
      return;
    }

    dispatch({ type: 'SET_SAVING', saving: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      if (expenseIdParam) {
        await expensesService.update(expenseIdParam, {
          title: state.title,
          totalAmount: state.totalAmount,
          currency: state.currency,
          splitType: state.splitMethod,
          payments: state.payers,
          splits: state.splits,
          participants: state.participants,
          notes: state.notes,
          date: state.date,
          category: state.category,
        });
      } else {
        await expensesService.create({
          title: state.title,
          totalAmount: state.totalAmount,
          currency: state.currency,
          contextType: state.contextType,
          groupId: state.selectedGroupId,
          payments: state.payers,
          splits: state.splits,
          splitType: state.splitMethod,
          participants: state.participants,
          directParticipants:
            state.contextType === 'non_group'
              ? state.participants.map(p => p.userId)
              : undefined,
          notes: state.notes,
          date: state.date,
          category: state.category,
        });
      }

      // ── Invalidate ALL cached data so every screen refreshes from DB ─────────
      await queryClient.invalidateQueries();

      navigation.goBack();
    } catch {
      dispatch({
        type: 'SET_ERROR',
        error:
          'Could not save expense. Please check your connection and try again.',
      });
    } finally {
      dispatch({ type: 'SET_SAVING', saving: false });
    }
  };

  const symbol = getSymbol(state.currency);
  const meId = currentUser?.id ?? 'me';

  if (state.loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Button
            onPress={() => navigation.goBack()}
            textColor={theme.colors.textSecondary}
            compact
          >
            Cancel
          </Button>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            {expenseIdParam ? 'Edit Expense' : 'Add Expense'}
          </Text>
          {expenseIdParam ? (
            <Button
              onPress={handleDelete}
              textColor={theme.colors.error}
              compact
            >
              Delete
            </Button>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {state.error && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: theme.colors.errorContainer,
                flexDirection: 'row',
                flexWrap: 'wrap',
              },
            ]}
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, flexShrink: 1 }}
            >
              {state.error}
            </Text>
          </View>
        )}

        {/* Amount & Currency */}
        <View style={styles.amountRow}>
          <CurrencySelector
            selected={state.currency}
            onSelect={c => dispatch({ type: 'SET_CURRENCY', currency: c })}
          />
          <TextInput
            mode="flat"
            keyboardType="decimal-pad"
            value={state.totalAmount > 0 ? state.totalAmount.toString() : ''}
            onChangeText={text => {
              const num = parseFloat(text) || 0;
              dispatch({ type: 'SET_AMOUNT', amount: num });
            }}
            placeholder={`${symbol}0.00`}
            style={[styles.amountInput, { color: theme.colors.onSurface }]}
            textColor={theme.colors.onSurface}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Title */}
        <TextInput
          mode="outlined"
          label="Description"
          value={state.title}
          onChangeText={text => dispatch({ type: 'SET_TITLE', title: text })}
          placeholder="What's this expense for?"
          style={[styles.titleInput, { backgroundColor: 'transparent' }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
        />

        {/* Context Selection */}
        {!expenseIdParam && (
          <View style={styles.contextSection}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.textSecondary, marginBottom: 8 }}
            >
              Context
            </Text>
            <SegmentedButtons
              value={state.contextType}
              onValueChange={v => {
                dispatch({
                  type: 'SET_CONTEXT_TYPE',
                  contextType: v as 'group' | 'non_group',
                });
                if (v === 'group') {
                  // Keep current group if selected
                } else {
                  dispatch({ type: 'SET_PARTICIPANTS', participants: [] });
                  dispatch({ type: 'SET_PAYERS', payers: [] });
                }
              }}
              buttons={[
                {
                  value: 'group',
                  label: 'With Group',
                  checkedColor: theme.primary,
                },
                {
                  value: 'non_group',
                  label: 'With Friends',
                  checkedColor: theme.primary,
                },
              ]}
            />

            {state.contextType === 'group' ? (
              <View style={styles.groupList}>
                {groups.length === 0 ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.textTertiary }}
                  >
                    No groups yet. Create one first.
                  </Text>
                ) : (
                  groups.map(g => {
                    const isSelected = state.selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.groupRow,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.outline,
                          },
                        ]}
                        onPress={() => handleSelectGroup(g)}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: isSelected
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          }}
                        >
                          {g.name}
                        </Text>
                        {isSelected && (
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.primary }}
                          >
                            Selected
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : (
              <View style={styles.friendList}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.textSecondary, marginBottom: 8 }}
                >
                  Tap to add friends:
                </Text>
                {state.participants.find(p => p.userId === meId) ? null : (
                  <TouchableOpacity
                    style={[
                      styles.friendRow,
                      {
                        backgroundColor: state.participants.find(
                          p => p.userId === meId,
                        )?.isActive
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => {
                      const updated = [
                        ...state.participants,
                        {
                          userId: meId,
                          name: currentUser?.name ?? 'You',
                          isActive: true,
                        },
                      ];
                      dispatch({
                        type: 'SET_PARTICIPANTS',
                        participants: updated,
                      });
                    }}
                  >
                    <AppAvatar
                      user={{ _id: meId, name: currentUser?.name ?? 'You' }}
                      size={36}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurface, marginLeft: 8 }}
                    >
                      You
                    </Text>
                  </TouchableOpacity>
                )}
                {friends.map(f => {
                  const isActive = state.participants.find(
                    p => p.userId === f._id,
                  )?.isActive;
                  return (
                    <TouchableOpacity
                      key={f._id}
                      style={[
                        styles.friendRow,
                        {
                          backgroundColor: isActive
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                          borderColor: isActive
                            ? theme.colors.primary
                            : theme.colors.outline,
                        },
                      ]}
                      onPress={() => handleAddFriendParticipant(f)}
                    >
                      <AppAvatar user={f} size={36} />
                      <Text
                        variant="bodyMedium"
                        style={{
                          color: theme.colors.onSurface,
                          marginLeft: 8,
                          flex: 1,
                        }}
                      >
                        {f.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: isActive
                            ? theme.colors.primary
                            : theme.colors.textTertiary,
                        }}
                      >
                        {isActive ? 'Added' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {friends.length === 0 && (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.textTertiary }}
                  >
                    No friends found. Add friends to split expenses.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Participants */}
        {state.participants.length > 0 && (
          <ParticipantSelector
            participants={state.participants}
            groupMembers={groupDetail?.members}
            contextType={state.contextType}
            onChange={pts =>
              dispatch({ type: 'SET_PARTICIPANTS', participants: pts })
            }
          />
        )}

        {/* Payer */}
        {state.participants.filter(p => p.isActive).length >= 2 && (
          <PayerSelector
            payers={state.payers}
            participants={state.participants}
            totalAmount={state.totalAmount}
            currency={state.currency}
            mode={state.payerMode}
            onChange={(payers, mode) => {
              dispatch({ type: 'SET_PAYER_MODE', mode });
              dispatch({ type: 'SET_PAYERS', payers });
            }}
          />
        )}

        {/* Split */}
        {state.participants.filter(p => p.isActive).length >= 1 && (
          <SplitConfigurator
            method={state.splitMethod}
            splits={state.splits}
            participants={state.participants}
            totalAmount={state.totalAmount}
            currency={state.currency}
            onChangeMethod={m =>
              dispatch({ type: 'SET_SPLIT_METHOD', method: m })
            }
            onChangeSplits={splits => dispatch({ type: 'SET_SPLITS', splits })}
          />
        )}

        {/* Date */}
        <DatePickerField
          date={state.date}
          onChange={d => dispatch({ type: 'SET_DATE', date: d })}
        />

        {/* Category */}
        <CategoryPicker
          selected={state.category}
          onSelect={c => dispatch({ type: 'SET_CATEGORY', category: c })}
        />

        {/* Notes */}
        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={state.notes}
          onChangeText={text => dispatch({ type: 'SET_NOTES', notes: text })}
          placeholder="Add any details..."
          multiline
          numberOfLines={3}
          style={[styles.notesInput, { backgroundColor: 'transparent' }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
        />
      </ScrollView>

      {/* Summary Bar */}
      <ExpenseSummaryBar
        expense={{
          title: state.title,
          totalAmount: state.totalAmount,
          currency: state.currency,
          contextType: state.contextType,
          groupId: state.selectedGroupId,
          participants: state.participants,
          payerMode: state.payerMode,
          payers: state.payers,
          splitMethod: state.splitMethod,
          splits: state.splits,
          date: state.date,
          notes: state.notes,
          category: state.category,
        }}
        onSave={handleSave}
        isSaving={state.saving}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    backgroundColor: 'transparent',
    height: 60,
  },
  titleInput: {
    marginBottom: 16,
  },
  contextSection: {
    marginBottom: 16,
  },
  groupList: {
    gap: 8,
    marginTop: 12,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendList: {
    gap: 8,
    marginTop: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesInput: {
    marginVertical: 8,
  },
});
