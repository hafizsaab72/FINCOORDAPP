import React, { useLayoutEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import {
  Text, Surface, Icon, IconButton, SegmentedButtons,
  List, Chip, Divider, Button,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { Bill } from '../types';

type Segment = 'overview' | 'bills' | 'reminders';
type BillFilter = 'all' | 'pending' | 'overdue' | 'handled';

const BILL_STATUS_CONFIG = {
  pending:  { color: '#FFAA00', icon: 'clock-outline' },
  overdue:  { color: '#FF3B30', icon: 'alert-circle-outline' },
  handled:  { color: '#0F7A5B', icon: 'check-circle-outline' },
};

export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const bills              = useStore(state => state.bills);
  const expenses           = useStore(state => state.expenses);
  const activities         = useStore(state => state.activities);
  const currency           = useStore(state => state.currency);
  const currentUser        = useStore(state => state.currentUser);
  const markBillHandled    = useStore(state => state.markBillHandled);

  const [activeSegment, setActiveSegment] = React.useState<Segment>('overview');
  const [billFilter, setBillFilter]       = React.useState<BillFilter>('all');

  const pendingBills  = useMemo(() => bills.filter(b => b.status === 'pending'),  [bills]);
  const overdueBills  = useMemo(() => bills.filter(b => b.status === 'overdue'),  [bills]);
  const alertCount    = pendingBills.length + overdueBills.length;
  const totalSpend    = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

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
            iconColor={alertCount > 0 ? '#FFAA00' : theme.primary}
            size={24}
            onPress={() => setActiveSegment('reminders')}
            accessibilityLabel={`${alertCount} pending reminders`}
          />
          <IconButton
            icon="magnify"
            iconColor={theme.primary}
            size={24}
            onPress={() => navigation.navigate('Search')}
          />
        </View>
      ),
    });
  }, [navigation, theme.primary, alertCount]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Segmented control — sticky above scrollable content */}
      <View style={[styles.segmentWrap, { borderBottomColor: theme.border }]}>
        <SegmentedButtons
          value={activeSegment}
          onValueChange={v => setActiveSegment(v as Segment)}
          buttons={[
            { value: 'overview',  label: 'Overview' },
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
        <ScrollView
          style={styles.scrollRoot}
          contentContainerStyle={styles.container}
        >
          <Text variant="titleMedium" style={[styles.greeting, { color: theme.text }]}>
            Good day{currentUser ? `, ${currentUser.name?.split(' ')[0] ?? 'User'}` : ''} 👋
          </Text>

          <View style={styles.tilesRow}>
            <SummaryCard
              icon="cash-multiple"
              label="Total Spend"
              value={formatAmount(totalSpend, currency)}
              accent={theme.primary}
              bg={theme.surface}
              border={theme.border}
            />
            <SummaryCard
              icon="receipt-clock"
              label="Pending Bills"
              value={`${pendingBills.length}`}
              accent="#FFAA00"
              bg={theme.surface}
              border={theme.border}
            />
          </View>

          {overdueBills.length > 0 && (
            <Surface
              style={[styles.alertBanner, { backgroundColor: '#FFF3F3', borderColor: '#FF3B30' }]}
              elevation={0}
            >
              <Icon source="alert-circle" size={18} color="#FF3B30" />
              <Text style={styles.alertText}>
                {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue — tap Reminders above
              </Text>
            </Surface>
          )}

          {/* Analytics shortcut card */}
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
            Analytics
          </Text>
          <Surface
            style={[styles.analyticsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            elevation={0}
          >
            <View style={styles.analyticsRow}>
              <View>
                <Text variant="bodySmall" style={{ color: theme.textSecondary }}>This month</Text>
                <Text variant="titleMedium" style={{ color: theme.primary, fontWeight: 'bold' }}>
                  {formatAmount(thisMonthTotal, currency)}
                </Text>
              </View>
              <Icon source="chart-bar" size={36} color={theme.primary + '50'} />
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

          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
            Recent Activity
          </Text>

          {activities.length === 0 ? (
            <Text style={styles.emptyText}>
              No activity yet.{'\n'}Add an expense or bill using the + button below.
            </Text>
          ) : (
            activities.slice(0, 5).map(entry => (
              <View key={entry.id} style={[styles.activityRow, { borderBottomColor: theme.border }]}>
                <Icon source={getActivityIcon(entry.action)} size={20} color={theme.primary} />
                <View style={styles.activityText}>
                  <Text variant="bodyMedium" style={{ color: theme.text }}>{entry.action}</Text>
                  <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{entry.detail}</Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                  {relativeTime(entry.timestamp)}
                </Text>
              </View>
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
                onPress={() => setBillFilter(f)}
                style={[styles.chip, billFilter === f && { backgroundColor: theme.primary + '20' }]}
                selectedColor={theme.primary}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Chip>
            ))}
          </ScrollView>
          <FlatList
            data={filteredBills}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Divider />}
            ListEmptyComponent={
              <View style={styles.emptyCenter}>
                <Icon source="receipt-text-outline" size={48} color={theme.border} />
                <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {billFilter === 'all'
                    ? 'No bills yet.\nUse + to add your first bill.'
                    : `No ${billFilter} bills.`}
                </Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Bills have moved here from the old Bills tab — add one with the + button.
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
                  onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
                  style={{ backgroundColor: theme.background }}
                  titleStyle={{ color: theme.text }}
                  descriptionStyle={{ color: theme.textSecondary }}
                />
              );
            }}
          />
        </View>
      )}

      {/* ── REMINDERS ── */}
      {activeSegment === 'reminders' && (
        <FlatList
          data={[...overdueBills, ...pendingBills]}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Icon source="bell-check-outline" size={48} color="#ccc" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                All clear! No pending reminders.
              </Text>
              <Text style={styles.emptyHint}>
                Reminders have moved here from the old Reminders tab. Due-date alerts appear as badges on the bell icon above.
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
                      onPress={() => markBillHandled(item.id)}
                    >
                      Done
                    </Button>
                  </View>
                )}
                onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
                style={{ backgroundColor: theme.background }}
                titleStyle={{ color: theme.text }}
                descriptionStyle={{ color: theme.textSecondary }}
              />
            );
          }}
        />
      )}
    </View>
  );
}

function SummaryCard({
  icon, label, value, accent, bg, border,
}: {
  icon: string; label: string; value: string; accent: string; bg: string; border: string;
}) {
  return (
    <Surface style={[styles.tile, { backgroundColor: bg, borderColor: border }]} elevation={0}>
      <Icon source={icon} size={24} color={accent} />
      <Text variant="bodySmall" style={styles.tileLabel}>{label}</Text>
      <Text variant="titleLarge" style={[styles.tileValue, { color: accent }]}>{value}</Text>
    </Surface>
  );
}

const getActivityIcon = (action: string) => {
  if (action.includes('Expense'))              return 'cash-multiple';
  if (action.includes('Bill') && action.includes('Add')) return 'receipt-text-plus';
  if (action.includes('Bill') && action.includes('Handle')) return 'check-circle-outline';
  if (action.includes('Group'))               return 'account-group';
  return 'clock-outline';
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
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  segmentWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentButtons: { },
  greeting: { marginBottom: 16, fontWeight: '600' },
  tilesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tile: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, gap: 6 },
  tileLabel: { color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontWeight: 'bold' },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16,
  },
  alertText: { color: '#FF3B30', fontWeight: '600', flex: 1 },
  sectionTitle: { marginTop: 8, marginBottom: 8, fontWeight: '600' },
  analyticsCard: {
    borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20,
  },
  analyticsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  activityText: { flex: 1 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { },
  billRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  reminderRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { textAlign: 'center' },
  emptyHint: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
