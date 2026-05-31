import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Surface, Text, Chip, List, Divider, Icon, Button, FAB } from 'react-native-paper';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import { useStore } from '../store/useStore';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { formatAmount, fromMinorUnits } from '../utils/currency';
import { useGlobalBalances } from '../hooks/useDashboard';
import { Activity } from '../types';
import { activitiesService } from '../services/activitiesService';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';
import { getActivityIcon, getActivityColor, relativeTime } from '../utils/ui';
import { colors as staticColors, spacing, radius, shadows } from '../theme/tokens';

type Filter = 'all' | 'expenses' | 'settlements';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
  AUD: 'A$', CHF: 'CHF', CNY: '¥', SGD: 'S$', HKD: 'HK$', AED: 'د.إ',
};

export default function ActivityScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currency = useStore(state => state.currency);
  const token = useStore(state => state.token);

  const { data: dashboard } = useGlobalBalances();

  const [activeFilter, setActiveFilter] = React.useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [apiActivities, setApiActivities] = useState<Activity[]>([]);

  const fetchActivities = useCallback(async () => {
    if (!token) return;
    try {
      const res = await activitiesService.getAll(50);
      if (res?.activities) {
        setApiActivities(res.activities);
      }
    } catch {
      // Silent fail
    }
  }, [token]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  // Analytics summary values — use dashboard API for accuracy (group + non-group)
  const thisMonthTotal = dashboard?.summary?.thisMonthTotal
    ? fromMinorUnits(dashboard.summary.thisMonthTotal)
    : 0;
  const lastMonthTotal = dashboard?.summary?.lastMonthTotal
    ? fromMinorUnits(dashboard.summary.lastMonthTotal)
    : 0;

  const filteredActivities = useMemo(() => {
    switch (activeFilter) {
      case 'expenses':
        return apiActivities.filter(a => a.action.includes('Expense') && !a.action.includes('Settlement'));
      case 'settlements':
        return apiActivities.filter(a => a.action.includes('Settlement'));
      default:
        return apiActivities;
    }
  }, [apiActivities, activeFilter]);

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all',         label: 'All' },
    { value: 'expenses',    label: 'Expenses' },
    { value: 'settlements', label: 'Settlements' },
  ];

  const renderActivityItem = ({ item }: { item: Activity }) => {
    const icon = getActivityIcon(item.action);
    const iconColor = getActivityColor(item.action, isDark);
    const isExpense = item.action.includes('Expense');

    const itemAmount = item.amount;
    const itemCurrency = item.currency;

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
          if (item.expenseId) {
            navigation.navigate('AddExpense', { expenseId: item.expenseId });
          } else if (item.groupId) {
            navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: item.groupId } });
          }
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
        <FlatList
          data={filteredActivities}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ItemSeparatorComponent={() => null}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 + insets.bottom }}
          ListEmptyComponent={
            <EmptyState
              icon="clock-outline"
              title={
                activeFilter === 'expenses'
                  ? 'No expenses logged yet.'
                  : activeFilter === 'settlements'
                  ? 'No settlements recorded yet.'
                  : 'No activity yet.'
              }
              subtitle={
                activeFilter === 'expenses'
                  ? 'Add one using the + button.'
                  : activeFilter === 'settlements'
                  ? undefined
                  : 'Actions will appear here automatically.'
              }
            />
          }
          renderItem={renderActivityItem}
        />
      </View>

      {/* FAB — Add Expense is the primary quick action from this screen */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET }]}
        color="#FFF"
        onPress={() => navigation.navigate('AddExpense')}
        label="Add Expense"
        accessibilityLabel="Add expense"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  analyticsBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    overflow: 'hidden',
  },
  analyticsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  analyticsTile: { flex: 1, gap: 4 },
  analyticsDivider: { width: 1, height: 36, marginHorizontal: 16 },
  analyticsBtn: { marginLeft: 12 },
  chipBar: { height: 56, justifyContent: 'center' },
  chipRow: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  chip: { height: 36 },

  // Activity row
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  activityRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 2, marginRight: 4 },

  fab: { position: 'absolute', right: 24 },
  billRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  reminderRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
});
