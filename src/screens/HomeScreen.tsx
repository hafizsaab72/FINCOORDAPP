import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Text,
  Surface,
  Icon,
  IconButton,
  SegmentedButtons,
  List,
  Chip,
  Divider,
  Button,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TouchableRipple,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { formatAmount } from '../utils/currency';
import { Bill } from '../types';
import SummaryTile from '../components/SummaryTile';
import DashboardSummary from '../components/DashboardSummary';
import { useGlobalBalances } from '../hooks/useDashboard';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';
import { haptics } from '../utils/haptics';

type Segment = 'overview' | 'bills' | 'reminders';
type BillFilter = 'all' | 'pending' | 'overdue' | 'handled';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const bills = useStore(state => state.bills);
  const expenses = useStore(state => state.expenses);
  const activities = useStore(state => state.activities);
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);
  const markBillHandled = useStore(state => state.markBillHandled);

  const [activeSegment, setActiveSegment] = useState<Segment>('overview');
  const [billFilter, setBillFilter] = useState<BillFilter>('all');

  const { data: dashboard } = useGlobalBalances();

  const pendingBills = useMemo(() => bills.filter(b => b.status === 'pending'), [bills]);
  const overdueBills = useMemo(() => bills.filter(b => b.status === 'overdue'), [bills]);
  const alertCount = pendingBills.length + overdueBills.length;
  const totalSpend = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const now = new Date();
  const thisMonthTotal = useMemo(
    () =>
      expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, e) => s + e.amount, 0),
    [expenses], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filteredBills = useMemo(() => {
    if (billFilter === 'all') return bills;
    return bills.filter(b => b.status === billFilter);
  }, [bills, billFilter]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <IconButton
            icon={alertCount > 0 ? 'bell-badge' : 'bell-outline'}
            iconColor={alertCount > 0 ? theme.colors.tertiary : theme.colors.primary}
            size={24}
            onPress={() => setActiveSegment('reminders')}
            accessibilityLabel={`${alertCount} pending reminders`}
          />
          <IconButton
            icon="magnify"
            iconColor={theme.colors.primary}
            size={24}
            onPress={() => navigation.navigate('Search')}
          />
        </View>
      ),
    });
  }, [navigation, theme.colors.primary, theme.colors.tertiary, alertCount]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Segmented control — sticky above scrollable content */}
      <View style={[styles.segmentWrap, { borderBottomColor: theme.colors.outline }]}>
        <SegmentedButtons
          value={activeSegment}
          onValueChange={v => {
            haptics.light();
            setActiveSegment(v as Segment);
          }}
          buttons={[
            { value: 'overview', label: 'Overview' },
            {
              value: 'bills',
              label: 'Bills',
              icon: bills.length > 0 ? undefined : undefined,
            },
            {
              value: 'reminders',
              label: alertCount > 0 ? `Reminders (${alertCount})` : 'Reminders',
            },
          ]}
          style={styles.segmentButtons}
        />
      </View>

      {/* ── OVERVIEW ── */}
      {activeSegment === 'overview' && (
        <ScrollView style={styles.scrollRoot} contentContainerStyle={styles.container}>
          <LinearGradient
            colors={[theme.colors.primary + '18', theme.colors.primary + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text variant="titleMedium" style={[styles.greeting, { color: theme.colors.onSurface, fontFamily: 'Manrope', fontWeight: '700' }]}>
              Good day{currentUser ? `, ${currentUser.name?.split(' ')[0] ?? 'User'}` : ''} 👋
            </Text>

            <View style={styles.tilesRow}>
            {dashboard?.summary ? (
              <DashboardSummary
                summary={dashboard.summary}
                onPress={() => navigation.navigate('GroupDetail', {
                  groupId: 'global',
                  groupName: 'All Groups',
                })}
              />
            ) : (
              <SummaryTile
                icon="cash-multiple"
                label="Total Spend"
                value={formatAmount(totalSpend, currency)}
                type="positive"
              />
            )}
            <SummaryTile
              icon="clock-outline"
              label="Pending Bills"
              value={`${pendingBills.length}`}
              type="neutral"
            />
          </View>
          </LinearGradient>

          {overdueBills.length > 0 && (
            <Surface
              style={[
                styles.alertBanner,
                { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error },
              ]}
              elevation={0}
            >
              <Icon source="alert-circle" size={18} color={theme.colors.error} />
              <Text variant="labelLarge" style={{ color: theme.colors.error, flex: 1 }}>
                {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue — tap Reminders
                above
              </Text>
            </Surface>
          )}

          {/* Analytics shortcut card */}
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontFamily: 'Manrope', fontWeight: '700' }]}>
            Analytics
          </Text>
          <Surface
            style={[
              styles.analyticsCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            elevation={1}
          >
            <View style={styles.analyticsRow}>
              <View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  This month
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  {formatAmount(thisMonthTotal, currency)}
                </Text>
              </View>
              <Icon source="chart-bar" size={36} color={theme.colors.primary + '50'} />
            </View>
            <Button
              mode="text"
              compact
              icon="chevron-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              onPress={() => navigation.navigate('Analytics')}
            >
              View full analytics
            </Button>
          </Surface>

          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontFamily: 'Manrope', fontWeight: '700' }]}>
            Recent Activity
          </Text>

          {activities.length === 0 ? (
            <Text style={styles.emptyText}>
              No activity yet.{'\n'}Add an expense or bill using the + button below.
            </Text>
          ) : (
            activities.slice(0, 5).map(entry => (
              <List.Item
                key={entry.id}
                title={entry.action}
                description={entry.detail}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={getActivityIcon(entry.action)}
                    color={getActivityColor(entry.action, theme)}
                  />
                )}
                right={() => (
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {entry.amount !== undefined && (
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                        {formatAmount(entry.amount, entry.currency || currency)}
                      </Text>
                    )}
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {relativeTime(entry.timestamp)}
                    </Text>
                  </View>
                )}
                style={{ backgroundColor: theme.colors.background }}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── BILLS ── */}
      {activeSegment === 'bills' && (
        <View style={styles.root}>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {(['all', 'pending', 'overdue', 'handled'] as BillFilter[]).map(f => (
              <Chip
                key={f}
                selected={billFilter === f}
                onPress={() => {
                  haptics.light();
                  setBillFilter(f);
                }}
                style={[
                  styles.filterChip,
                  billFilter === f && { backgroundColor: theme.colors.primaryContainer },
                ]}
                selectedColor={theme.colors.primary}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Chip>
            ))}
          </ScrollView>
          <FlatList
            data={filteredBills}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title={
                  billFilter === 'all'
                    ? 'No bills yet.\nUse + to add your first bill.'
                    : `No ${billFilter} bills.`
                }
                subtitle="Bills have moved here from the old Bills tab — add one with the + button."
              />
            }
            renderItem={({ item }: { item: Bill }) => (
              <List.Item
                title={item.title}
                description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${item.category}${item.isRecurring ? ' · Recurring' : ''}`}
                left={props => <List.Icon {...props} icon="receipt-outline" color={theme.colors.primary} />}
                right={() => (
                  <View style={styles.billRight}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                      {formatAmount(item.amount, currency)}
                    </Text>
                    <StatusChip type={item.status} />
                  </View>
                )}
                onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
                style={{ backgroundColor: theme.colors.background }}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
            )}
          />
        </View>
      )}

      {/* ── REMINDERS ── */}
      {activeSegment === 'reminders' && (
        <FlatList
          data={[...overdueBills, ...pendingBills]}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="bell-check-outline"
              title="All clear! No pending reminders."
              subtitle="Reminders have moved here from the old Reminders tab. Due-date alerts appear as badges on the bell icon above."
            />
          }
          renderItem={({ item }: { item: Bill }) => {
            const overdue = item.status === 'overdue';
            return (
              <List.Item
                title={item.title}
                description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${formatAmount(item.amount, currency)}`}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={overdue ? 'bell-alert' : 'bell-outline'}
                    color={overdue ? theme.colors.error : theme.colors.tertiary}
                  />
                )}
                right={() => (
                  <View style={styles.reminderRight}>
                    <StatusChip type={overdue ? 'overdue' : 'pending'} />
                    <Button
                      mode="text"
                      compact
                      icon="check"
                      textColor={theme.colors.primary}
                      onPress={() => {
                        haptics.success();
                        markBillHandled(item.id);
                      }}
                    >
                      Done
                    </Button>
                  </View>
                )}
                onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
                style={{ backgroundColor: theme.colors.background }}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const getActivityIcon = (action: string) => {
  if (action.includes('Expense')) return 'cash-multiple';
  if (action.includes('Bill') && action.includes('Add')) return 'receipt-text-plus';
  if (action.includes('Bill') && action.includes('Handle')) return 'check-circle-outline';
  if (action.includes('Member')) return 'account-plus';
  if (action.includes('Group')) return 'account-group';
  return 'clock-outline';
};

const getActivityColor = (action: string, theme: any) => {
  if (action.includes('Expense')) return theme.colors.primary;
  if (action.includes('Bill')) return theme.colors.tertiary;
  if (action.includes('Group') || action.includes('Member')) return theme.colors.tertiary;
  return theme.colors.onSurfaceVariant;
};

const relativeTime = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollRoot: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  heroGradient: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderRadius: 16,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  segmentWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentButtons: {},
  greeting: { marginBottom: 16 },
  tilesRow: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: { marginTop: 8, marginBottom: 8 },
  analyticsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { marginRight: 8, height: 36, justifyContent: 'center' },
  billRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  reminderRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  emptyText: { textAlign: 'center' },
});
