import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Icon, IconButton } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="magnify"
          iconColor={theme.primary}
          size={24}
          onPress={() => navigation.getParent()?.navigate('Search')}
        />
      ),
    });
  }, [navigation, theme.primary]);
  const bills = useStore(state => state.bills);
  const expenses = useStore(state => state.expenses);
  const activities = useStore(state => state.activities);
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);

  const pendingBills = bills.filter(b => b.status === 'pending');
  const overdueBills = bills.filter(b => b.status === 'overdue');
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <Text variant="titleMedium" style={[styles.greeting, { color: theme.text }]}>
        Good day{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''} 👋
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
            {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue
          </Text>
        </Surface>
      )}

      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
        Recent Activity
      </Text>

      {activities.length === 0 ? (
        <Text style={styles.emptyText}>No activity yet. Add an expense or bill to get started.</Text>
      ) : (
        activities.slice(0, 5).map(entry => (
          <View
            key={entry.id}
            style={[styles.activityRow, { borderBottomColor: theme.border }]}
          >
            <Icon
              source={getActivityIcon(entry.action)}
              size={20}
              color={theme.primary}
            />
            <View style={styles.activityText}>
              <Text variant="bodyMedium" style={{ color: theme.text }}>
                {entry.action}
              </Text>
              <Text variant="bodySmall" style={{ color: '#888' }}>
                {entry.detail}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: '#999' }}>
              {relativeTime(entry.timestamp)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
  bg,
  border,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
  bg: string;
  border: string;
}) {
  return (
    <Surface
      style={[styles.tile, { backgroundColor: bg, borderColor: border }]}
      elevation={0}
    >
      <Icon source={icon} size={24} color={accent} />
      <Text variant="bodySmall" style={styles.tileLabel}>
        {label}
      </Text>
      <Text variant="titleLarge" style={[styles.tileValue, { color: accent }]}>
        {value}
      </Text>
    </Surface>
  );
}

const getActivityIcon = (action: string) => {
  if (action.includes('Expense')) return 'cash-multiple';
  if (action.includes('Bill') && action.includes('Add')) return 'receipt-text-plus';
  if (action.includes('Bill') && action.includes('Handle')) return 'check-circle-outline';
  if (action.includes('Group')) return 'account-group';
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
  scrollRoot: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  greeting: { marginBottom: 16, fontWeight: '600' },
  tilesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tile: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tileLabel: { color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontWeight: 'bold' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertText: { color: '#FF3B30', fontWeight: '600' },
  sectionTitle: { marginBottom: 12, fontWeight: '600' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityText: { flex: 1 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 24 },
});
