import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { List, Divider, Text, Chip, Surface, Icon, Button, FAB } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { Bill } from '../types';
import { activitiesService } from '../services/activitiesService';
import { billsService } from '../services/billsService';

type Filter = 'all' | 'expenses' | 'bills' | 'reminders' | 'payments';

const getActivityIcon = (action: string) => {
  if (action.includes('Expense'))        return 'cash-multiple';
  if (action.includes('Added Bill'))     return 'receipt-text-plus';
  if (action.includes('Bill Handled'))   return 'check-circle-outline';
  if (action.includes('Group'))          return 'account-group-outline';
  return 'clock-outline';
};

const getActivityColor = (action: string) => {
  if (action.includes('Expense'))        return '#0F7A5B';
  if (action.includes('Added Bill'))     return '#FFAA00';
  if (action.includes('Bill Handled'))   return '#0F7A5B';
  if (action.includes('Group'))          return '#5C6BC0';
  return '#999';
};

const BILL_STATUS_CONFIG = {
  pending: { color: '#FFAA00', icon: 'clock-outline' },
  overdue: { color: '#FF3B30', icon: 'alert-circle-outline' },
  handled: { color: '#0F7A5B', icon: 'check-circle-outline' },
};



/** Parse activity detail to extract amount, group name, and user names */
function parseActivityDetail(detail: string): {
  mainText: string;
  amount?: number;
  amountText?: string;
  isPositive?: boolean;
} {
  // Try to find amount patterns like "₹1,650.00" or "$100.00"
  const amountMatch = detail.match(/([₹$€£¥]\s*[\d,]+\.?\d*)/);
  if (!amountMatch) return { mainText: detail };

  const amountStr = amountMatch[1].replace(/[,\s]/g, '');
  const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));
  const isPositive = detail.includes('get back') || detail.includes('owes you') || detail.includes('are owed');

  // Remove the amount from the main text for cleaner display
  let mainText = detail.replace(amountMatch[0], '').trim();
  // Clean up extra punctuation
  mainText = mainText.replace(/\s+\./, '.').replace(/\.{2,}/, '.');

  return { mainText, amount, amountText: amountMatch[1], isPositive };
}

export default function ActivityScreen({ navigation }: any) {
  const { theme } = useAppTheme();
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
      // Merge: API entries take precedence; keep local-only entries not in API
      const apiIds = new Set(res.activities.map((a: any) => a.id ?? a._id));
      const localOnly = useStore.getState().activities.filter(a => !apiIds.has(a.id));
      const merged = [
        ...res.activities.map((a: any) => ({
          id: a.id ?? a._id,
          action: a.action,
          detail: a.detail,
          timestamp: a.timestamp ?? a.createdAt,
        })),
        ...localOnly,
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      useStore.setState({ activities: merged });
    } catch {
      // Silent fail — local activities remain
    }
  }, [token]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

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

  const renderActivityItem = ({ item }: { item: { id: string; action: string; detail: string; timestamp: string } }) => {
    const parsed = parseActivityDetail(item.detail);
    const icon = getActivityIcon(item.action);
    const iconColor = getActivityColor(item.action);
    const isExpense = item.action.includes('Expense');

    return (
      <TouchableOpacity
        style={[styles.activityRow, { borderBottomColor: theme.border }]}
        onPress={() => {
          if (isExpense) navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: 'direct' } });
          else if (item.action.includes('Bill')) navigation.navigate('HomeTab', { screen: 'BillDetail', params: { billId: item.id } });
        }}
        activeOpacity={0.7}
      >
        {/* Left icon */}
        <View style={[styles.activityIconBox, { backgroundColor: iconColor + '18' }]}>
          <Icon source={icon} size={20} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.activityContent}>
          <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '500' }} numberOfLines={2}>
            {item.action}
            {item.detail && item.detail !== item.action && (
              <Text style={{ color: theme.textSecondary }}> · {parsed.mainText}</Text>
            )}
          </Text>

          {/* Amount line */}
          {(parsed.amount !== undefined && parsed.amountText) && (
            <Text style={{ marginTop: 2 }}>
              {parsed.isPositive ? (
                <Text style={{ color: '#0F7A5B', fontWeight: '600' }}>
                  You get back {parsed.amountText}
                </Text>
              ) : (
                <Text style={{ color: '#E8673A', fontWeight: '600' }}>
                  You owe {parsed.amountText}
                </Text>
              )}
            </Text>
          )}

          {/* Timestamp */}
          <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {new Date(item.timestamp).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric',
            })} at {new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Analytics summary — always visible at top */}
      <Surface style={[styles.analyticsBanner, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        <View style={styles.analyticsInner}>
          <View style={styles.analyticsTile}>
            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>This month</Text>
            <Text variant="titleSmall" style={{ color: theme.primary, fontWeight: 'bold' }}>
              {formatAmount(thisMonthTotal, currency)}
            </Text>
          </View>
          <View style={[styles.analyticsDivider, { backgroundColor: theme.border }]} />
          <View style={styles.analyticsTile}>
            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Last month</Text>
            <Text variant="titleSmall" style={{ color: '#888', fontWeight: '600' }}>
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

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {FILTERS.map(f => (
          <Chip
            key={f.value}
            selected={activeFilter === f.value}
            onPress={() => setActiveFilter(f.value)}
            style={[styles.chip, activeFilter === f.value && { backgroundColor: theme.primary + '20' }]}
            selectedColor={theme.primary}
          >
            {f.label}
          </Chip>
        ))}
      </ScrollView>

      {/* ── Activity feed (All / Expenses / Payments) ── */}
      {activeFilter !== 'bills' && activeFilter !== 'reminders' && (
        <FlatList
          data={filteredActivities}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ItemSeparatorComponent={() => null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon source="clock-outline" size={48} color="#ccc" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                {activeFilter === 'expenses'
                  ? 'No expenses logged yet.\nAdd one using the + button.'
                  : activeFilter === 'payments'
                  ? 'No payments recorded yet.'
                  : 'No activity yet.\nActions will appear here automatically.'}
              </Text>
            </View>
          }
          renderItem={renderActivityItem}
        />
      )}

      {/* ── Bills ── */}
      {activeFilter === 'bills' && (
        <FlatList
          data={bills}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon source="receipt-text-outline" size={48} color="#ccc" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No bills yet.{'\n'}Tap + to add your first bill.
              </Text>
              <Text style={styles.emptyHint}>
                Bills have moved here — they're now part of the Activity feed.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Bill }) => {
            const cfg = BILL_STATUS_CONFIG[item.status];
            return (
              <List.Item
                title={item.title}
                description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${item.category}${item.isRecurring ? ' · Recurring' : ''}`}
                left={props => <List.Icon {...props} icon="receipt-text-outline" color={theme.primary} />}
                right={() => (
                  <View style={styles.billRight}>
                    <Text variant="titleSmall" style={{ color: theme.text, fontWeight: '600' }}>
                      {formatAmount(item.amount, currency)}
                    </Text>
                    <Chip
                      compact
                      mode="outlined"
                      icon={cfg.icon}
                      textStyle={{ color: cfg.color, fontSize: 10 }}
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

      {/* ── Reminders ── */}
      {activeFilter === 'reminders' && (
        <FlatList
          data={pendingBills}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon source="bell-check-outline" size={48} color="#ccc" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                All clear! No pending reminders.
              </Text>
              <Text style={styles.emptyHint}>
                Reminders have moved here from the old Reminders tab. Overdue and pending bills appear in this filter.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Bill }) => {
            const overdue = item.status === 'overdue';
            const chipColor = overdue ? '#FF3B30' : '#FFAA00';
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
                      textStyle={{ color: chipColor, fontSize: 10 }}
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
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { },

  // Activity row
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  activityContent: { flex: 1 },

  timestamp: { color: '#999', alignSelf: 'center', marginRight: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { color: '#999', textAlign: 'center' },
  emptyHint: { color: '#bbb', textAlign: 'center', fontSize: 12, lineHeight: 18 },
  fab: { position: 'absolute', right: 24 },
  billRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  reminderRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
});
