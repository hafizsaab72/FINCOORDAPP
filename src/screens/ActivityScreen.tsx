import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Surface, Text, Chip, List, Divider, Icon, Button, FAB } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { Bill } from '../types';
import { activitiesService } from '../services/activitiesService';
import { billsService } from '../services/billsService';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';
import { getActivityIcon, getActivityColor, relativeTime } from '../utils/ui';

type Filter = 'all' | 'expenses' | 'bills' | 'reminders' | 'payments';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
  AUD: 'A$', CHF: 'CHF', CNY: '¥', SGD: 'S$', HKD: 'HK$', AED: 'د.إ',
};

export default function ActivityScreen({ navigation }: any) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const activities      = useStore(state => state.activities);
  const bills           = useStore(state => state.bills);
  const expenses        = useStore(state => state.expenses);
  const currency        = useStore(state => state.currency);
  const token           = useStore(state => state.token);
  const markBillHandled = useStore(state => state.markBillHandled);
  const deleteBill      = useStore(state => state.deleteBill);
  const setBills        = useStore(state => state.setBills);

  const [activeFilter, setActiveFilter] = React.useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch activities from API on mount and merge with local
  const fetchActivities = useCallback(async () => {
    if (!token) return;
    try {
      const res = await activitiesService.getAll(50);
      if (!res?.activities) return;
      // Merge: API entries take precedence; preserve local amount/currency if API omits them
      const apiIds = new Set(res.activities.map((a: any) => a.id ?? a._id));
      const localMap = new Map(useStore.getState().activities.map(a => [a.id, a]));
      const merged = [
        ...res.activities.map((a: any) => {
          const local = localMap.get(a.id ?? a._id);
          return {
            id: a.id ?? a._id,
            action: a.action,
            detail: a.detail,
            timestamp: a.timestamp ?? a.createdAt,
            amount: a.amount ?? local?.amount,
            currency: a.currency ?? local?.currency,
          };
        }),
        ...useStore.getState().activities.filter(a => !apiIds.has(a.id)),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      useStore.setState({ activities: merged });
    } catch {
      // Silent fail — local activities remain
    }
  }, [token]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // One-time patch: recover amount/currency for activities that were stripped by older API fetches
  useEffect(() => {
    const acts = useStore.getState().activities;
    const exps = useStore.getState().expenses;
    const bills = useStore.getState().bills;
    const needsPatch = acts.some(a =>
      (a.action.includes('Expense') || a.action.includes('Bill')) && a.amount === undefined,
    );
    if (!needsPatch) return;
    const patched = acts.map(a => {
      if (a.amount !== undefined) return a;
      if (a.action.includes('Expense')) {
        const match = exps.find(e => e.notes === a.detail || e.id === a.detail);
        if (match) return { ...a, amount: match.amount, currency: match.currency };
      }
      if (a.action.includes('Bill')) {
        const match = bills.find(b => b.title === a.detail || b.id === a.detail);
        if (match) return { ...a, amount: match.amount, currency: match.currency };
      }
      return a;
    });
    useStore.setState({ activities: patched });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActivities(),
      token ? billsService.getAll().then(r => { if (r?.bills) setBills(r.bills); }).catch(() => {}) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [fetchActivities, token, setBills]);

  const handleMarkHandled = useCallback((id: string) => {
    markBillHandled(id);
    if (token) {
      billsService.markHandled(id).catch(() => {});
    }
  }, [markBillHandled, token]);

  const handleLongPressBill = useCallback((item: Bill) => {
    Alert.alert(
      item.title,
      'What would you like to do?',
      [
        {
          text: 'Mark Handled',
          onPress: () => handleMarkHandled(item.id),
        },
        {
          text: 'Delete Bill',
          style: 'destructive',
          onPress: () => {
            deleteBill(item.id);
            if (token) {
              billsService.delete(item.id).catch(() => {});
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [handleMarkHandled, deleteBill, token]);

  // Analytics summary values
  const now = new Date();
  const thisMonthTotal = useMemo(
    () => expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0),
    [expenses], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const lastMonthTotal = useMemo(
    () => expenses
      .filter(e => {
        const d = new Date(e.date);
        const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lm && d.getFullYear() === ly;
      })
      .reduce((s, e) => s + e.amount, 0),
    [expenses], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pendingBills = useMemo(
    () => [...bills.filter(b => b.status === 'overdue'), ...bills.filter(b => b.status === 'pending')],
    [bills],
  );

  const filteredActivities = useMemo(() => {
    switch (activeFilter) {
      case 'expenses': return activities.filter(a => a.action.includes('Expense'));
      case 'payments': return activities.filter(a => a.action.includes('Handled'));
      default:         return activities;
    }
  }, [activities, activeFilter]);

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all',       label: 'All' },
    { value: 'expenses',  label: 'Expenses' },
    { value: 'bills',     label: 'Bills' },
    { value: 'reminders', label: `Reminders${pendingBills.length > 0 ? ` (${pendingBills.length})` : ''}` },
    { value: 'payments',  label: 'Payments' },
  ];

  const renderActivityItem = ({ item }: { item: { id: string; action: string; detail: string; timestamp: string; amount?: number; currency?: string } }) => {
    const icon = getActivityIcon(item.action);
    const iconColor = getActivityColor(item.action, isDark);
    const isExpense = item.action.includes('Expense');
    const isBill = item.action.includes('Bill');

    // Live fallback: lookup amount from expenses/bills if activity was stripped by API
    let itemAmount = item.amount;
    let itemCurrency = item.currency;
    if (typeof itemAmount !== 'number' && isExpense) {
      const match = expenses.find(e => e.notes === item.detail || e.id === item.detail);
      if (match) { itemAmount = match.amount; itemCurrency = match.currency; }
    }
    if (typeof itemAmount !== 'number' && isBill) {
      const match = bills.find(b => b.title === item.detail || b.id === item.detail);
      if (match) { itemAmount = match.amount; itemCurrency = match.currency; }
    }

    const hasAmount = typeof itemAmount === 'number';
    const amtSymbol = itemCurrency ? (CURRENCY_SYMBOLS[itemCurrency] ?? itemCurrency) : (CURRENCY_SYMBOLS[currency] ?? currency);

    // Clean up detail text (skip raw IDs)
    const detailText = item.detail && item.detail !== item.action && !item.detail.startsWith('act-') && item.detail.length > 3
      ? item.detail
      : '';

    return (
      <List.Item
        title={item.action}
        description={detailText || undefined}
        left={() => (
          <View style={[styles.activityIconBox, { backgroundColor: iconColor + '18' }]}>
            <Icon source={icon} size={20} color={iconColor} />
          </View>
        )}
        right={() => (
          <View style={styles.activityRight}>
            {hasAmount && (
              <Text variant="labelLarge" style={{ color: iconColor }}>
                {amtSymbol}{itemAmount?.toFixed(2)}
              </Text>
            )}
            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
              {relativeTime(item.timestamp)}
            </Text>
          </View>
        )}
        onPress={() => {
          if (isExpense) navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: 'direct' } });
          else if (isBill) navigation.navigate('HomeTab', { screen: 'BillDetail', params: { billId: item.id } });
        }}
        style={{ backgroundColor: theme.background }}
        titleStyle={{ color: theme.text }}
        descriptionStyle={{ color: theme.textSecondary }}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Analytics summary — always visible at top */}
      <Surface style={[styles.analyticsBanner, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        <View style={styles.analyticsInner}>
          <View style={styles.analyticsTile}>
            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>This month</Text>
            <Text variant="titleSmall" style={{ color: theme.primary }}>
              {formatAmount(thisMonthTotal, currency)}
            </Text>
          </View>
          <View style={[styles.analyticsDivider, { backgroundColor: theme.border }]} />
          <View style={styles.analyticsTile}>
            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Last month</Text>
            <Text variant="titleSmall" style={{ color: theme.textSecondary }}>
              {formatAmount(lastMonthTotal, currency)}
            </Text>
          </View>
          <Button
            mode="text"
            compact
            icon="chart-bar"
            onPress={() => navigation.navigate('Analytics')}
            style={styles.analyticsBtn}
          >
            Analytics
          </Button>
        </View>
      </Surface>

      {/* Filter chips — fixed height row */}
      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map(f => (
            <Chip
              key={f.value}
              selected={activeFilter === f.value}
              onPress={() => {
                haptics.selection();
                setActiveFilter(f.value);
              }}
              style={[styles.chip, activeFilter === f.value && { backgroundColor: theme.primary + '20' }]}
              selectedColor={theme.primary}
            >
              {f.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* ── Content area ── */}
      <View style={{ flex: 1 }}>
        {/* Activity feed (All / Expenses / Payments) */}
        {activeFilter !== 'bills' && activeFilter !== 'reminders' && (
          <FlatList
            data={filteredActivities}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
            ItemSeparatorComponent={() => null}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon="clock-outline"
                title={
                  activeFilter === 'expenses'
                    ? 'No expenses logged yet.'
                    : activeFilter === 'payments'
                    ? 'No payments recorded yet.'
                    : 'No activity yet.'
                }
                subtitle={
                  activeFilter === 'expenses'
                    ? 'Add one using the + button.'
                    : activeFilter === 'payments'
                    ? undefined
                    : 'Actions will appear here automatically.'
                }
              />
            }
            renderItem={renderActivityItem}
          />
        )}

        {/* Bills */}
        {activeFilter === 'bills' && (
          <FlatList
            data={bills}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon="receipt-text-outline"
                title="No bills yet."
                subtitle="Tap + to add your first bill. Bills have moved here — they're now part of the Activity feed."
              />
            }
            renderItem={({ item }: { item: Bill }) => {
              const cfg = {
                pending: { color: theme.warning, icon: 'clock-outline' },
                overdue: { color: theme.error, icon: 'alert-circle-outline' },
                handled: { color: theme.success, icon: 'check-circle-outline' },
              }[item.status];
              return (
                <List.Item
                  title={item.title}
                  description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${item.category}${item.isRecurring ? ' · Recurring' : ''}`}
                  left={props => <List.Icon {...props} icon="receipt-text-outline" color={theme.primary} />}
                  right={() => (
                    <View style={styles.billRight}>
                      <Text variant="titleSmall" style={{ color: theme.text }}>
                        {formatAmount(item.amount, currency)}
                      </Text>
                      <Chip
                        compact
                        mode="outlined"
                        icon={cfg.icon}
                        textStyle={{ color: cfg.color }}
                        style={{ borderColor: cfg.color }}
                      >
                        {item.status}
                      </Chip>
                    </View>
                  )}
                  onPress={() => navigation.navigate('HomeTab', { screen: 'BillDetail', params: { billId: item.id } })}
                  onLongPress={() => handleLongPressBill(item)}
                  style={{ backgroundColor: theme.background }}
                  titleStyle={{ color: theme.text }}
                  descriptionStyle={{ color: theme.textSecondary }}
                />
              );
            }}
          />
        )}

        {/* Reminders */}
        {activeFilter === 'reminders' && (
          <FlatList
            data={pendingBills}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon="bell-check-outline"
                title="All clear! No pending reminders."
                subtitle="Reminders have moved here from the old Reminders tab. Overdue and pending bills appear in this filter."
              />
            }
            renderItem={({ item }: { item: Bill }) => {
              const overdue = item.status === 'overdue';
              const chipColor = overdue ? theme.error : theme.warning;
              return (
                <List.Item
                  title={item.title}
                  description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${formatAmount(item.amount, currency)}`}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={overdue ? 'bell-alert' : 'bell-outline'}
                      color={chipColor}
                    />
                  )}
                  right={() => (
                    <View style={styles.reminderRight}>
                      <Chip
                        compact
                        mode="outlined"
                        icon={overdue ? 'alert-circle-outline' : 'clock-outline'}
                        textStyle={{ color: chipColor }}
                        style={{ borderColor: chipColor }}
                      >
                        {overdue ? 'overdue' : 'pending'}
                      </Chip>
                      <Button
                        mode="text"
                        compact
                        icon="check"
                        textColor={theme.primary}
                        onPress={() => handleMarkHandled(item.id)}
                      >
                        Done
                      </Button>
                    </View>
                  )}
                  onPress={() => navigation.navigate('HomeTab', { screen: 'BillDetail', params: { billId: item.id } })}
                  onLongPress={() => handleLongPressBill(item)}
                  style={{ backgroundColor: theme.background }}
                  titleStyle={{ color: theme.text }}
                  descriptionStyle={{ color: theme.textSecondary }}
                />
              );
            }}
          />
        )}
      </View>

      {/* FAB — Add Expense is the primary quick action from this screen */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary, bottom: Math.max(24, insets.bottom + 8) }]}
        color="#FFF"
        onPress={() => navigation.navigate(activeFilter === 'bills' ? 'AddBillModal' : 'AddExpenseModal')}
        label={activeFilter === 'bills' ? 'Add Bill' : 'Add Expense'}
        accessibilityLabel={activeFilter === 'bills' ? 'Add bill' : 'Add expense'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  analyticsBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  analyticsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  analyticsTile: { flex: 1, gap: 2 },
  analyticsDivider: { width: 1, height: 32, marginHorizontal: 12 },
  analyticsBtn: { marginLeft: 8 },
  chipBar: { height: 52, justifyContent: 'center' },
  chipRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: { height: 34 },

  // Activity row
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  activityRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 2, marginRight: 4 },

  fab: { position: 'absolute', right: 24 },
  billRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  reminderRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
});
