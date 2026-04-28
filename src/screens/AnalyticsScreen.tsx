import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, Icon, Button } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import ProGate from '../components/ProGate';

const SCREEN_W = Dimensions.get('window').width;

const CATEGORY_COLORS = ['#0F7A5B', '#19A874', '#34C88A', '#FFAA00', '#FF6B35', '#6C63FF', '#FF3B30'];

export default function AnalyticsScreen({ route }: any) {
  const { theme } = useAppTheme();
  const expenses = useStore(state => state.expenses);
  const bills = useStore(state => state.bills);
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);
  const isPro = useStore(state => state.isPro);

  const friendId = route?.params?.friendId;
  const friendName = route?.params?.friendName;

  // Filter expenses to friend-specific if navigated from FriendDetail
  const filteredExpenses = friendId
    ? expenses.filter(e => e.payerId === friendId || Object.keys(e.splitDetails).includes(friendId))
    : expenses;

  // Build a map of user IDs to names from groups and expenses
  const nameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (currentUser?.id) map[currentUser.id] = currentUser.name;
    // Resolve names from expenses participantNames
    for (const e of expenses) {
      if (e.participantNames) {
        Object.assign(map, e.participantNames);
      }
    }
    return map;
  }, [expenses, currentUser]);

  // --- Totals ---
  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Calculate user's share (what they paid + what they owe)
  const myId = currentUser?.id ?? '';
  const yourShare = React.useMemo(() => {
    let share = 0;
    for (const e of filteredExpenses) {
      const participants = Object.keys(e.splitDetails);
      if (participants.length === 0) continue;

      let myShare = 0;
      if (e.splitMethod === 'equal') {
        myShare = e.amount / participants.length;
      } else if (e.splitMethod === 'percentage') {
        myShare = (e.amount * (e.splitDetails[myId] || 0)) / 100;
      } else {
        myShare = e.splitDetails[myId] || 0;
      }

      if (participants.includes(myId)) {
        share += myShare;
      }
    }
    return share;
  }, [filteredExpenses, myId]);

  const percentage = totalSpent > 0 ? Math.round((yourShare / totalSpent) * 100) : 0;

  // --- Pie chart data by category ---
  const pieData = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const e of filteredExpenses) {
      const cat = e.notes?.split(' ')[0] || 'Other';
      catMap[cat] = (catMap[cat] || 0) + e.amount;
    }
    // Also include bills
    for (const b of bills) {
      catMap[b.category] = (catMap[b.category] || 0) + b.amount;
    }
    const entries = Object.entries(catMap);
    if (entries.length === 0) return null;

    return entries.map(([cat, total], idx) => ({
      value: parseFloat(total.toFixed(2)),
      text: cat,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [filteredExpenses, bills]);

  const chartTotal = pieData?.reduce((s, d) => s + d.value, 0) ?? 0;

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      {friendName && (
        <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          WITH {friendName.toUpperCase()}
        </Text>
      )}

      {/* Header */}
      <Text variant="headlineMedium" style={{ color: theme.text, fontWeight: '700', marginBottom: 4 }}>
        {friendName || 'All-time spending'}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginBottom: 20 }}>
        All-time spending
      </Text>

      {/* Donut chart */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {pieData && chartTotal > 0 ? (
          <PieChart
            data={pieData}
            donut
            radius={SCREEN_W * 0.28}
            innerRadius={SCREEN_W * 0.22}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Total</Text>
                <Text variant="titleMedium" style={{ color: theme.primary, fontWeight: '700' }}>
                  {formatAmount(chartTotal, currency)}
                </Text>
              </View>
            )}
            isAnimated
          />
        ) : (
          <View style={[styles.emptyDonut, { borderColor: theme.border }]}>
            <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>No data yet</Text>
          </View>
        )}
      </View>

      {/* Total spent */}
      <View style={styles.metricRow}>
        <View style={[styles.metricDot, { backgroundColor: theme.primary }]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
            Total spent <Icon source="information-outline" size={14} color={theme.textSecondary} />
          </Text>
          <Text variant="headlineSmall" style={{ color: theme.primary, fontWeight: '700', marginTop: 2 }}>
            {formatAmount(totalSpent, currency)}
          </Text>
        </View>
      </View>

      {/* Your share */}
      <View style={styles.metricRow}>
        <View style={[styles.metricDot, { backgroundColor: theme.primary }]} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
            Your share <Icon source="information-outline" size={14} color={theme.textSecondary} />
          </Text>
          <Text variant="headlineSmall" style={{ color: theme.primary, fontWeight: '700', marginTop: 2 }}>
            {formatAmount(yourShare, currency)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {percentage}% of total group spending
          </Text>
        </View>
      </View>

      {/* Pro banner */}
      {!isPro && (
        <Surface style={[styles.proCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
          <Text variant="titleMedium" style={{ color: theme.text, fontWeight: '600', textAlign: 'center' }}>
            Pro users get more
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 4 }}>
            More insights. More features. More!
          </Text>
          <Button
            mode="contained"
            style={[styles.proBtn, { backgroundColor: '#7B4FA3' }]}
            onPress={() => { /* navigate to upgrade */ }}
          >
            Get FinCoord Pro
          </Button>
        </Surface>
      )}

      {/* Charts — Pro only */}
      <ProGate feature="Spending Charts">
        <>
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            SPENDING BY CATEGORY
          </Text>
          <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
            {!pieData ? (
              <EmptyChart label="No spending data yet" theme={theme} />
            ) : (
              <View style={styles.legend}>
                {pieData.map(d => (
                  <View key={d.text} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                    <Text variant="bodySmall" style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                      {d.text}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                      {formatAmount(d.value, currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Surface>

          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            TOP PAYERS
          </Text>
          <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
            {(() => {
              const payerMap: Record<string, number> = {};
              for (const e of filteredExpenses) {
                payerMap[e.payerId] = (payerMap[e.payerId] || 0) + e.amount;
              }
              const topSpenders = Object.entries(payerMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

              return topSpenders.length === 0 ? (
                <EmptyChart label="No payer data yet" theme={theme} />
              ) : (
                topSpenders.map(([payerId, total], idx) => (
                  <View key={payerId} style={[styles.spenderRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.primary + '20' }]}>
                      <Text variant="labelSmall" style={{ color: theme.primary, fontWeight: 'bold' }}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                      {nameMap[payerId] || payerId}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.primary, fontWeight: '600' }}>
                      {formatAmount(total, currency)}
                    </Text>
                  </View>
                ))
              );
            })()}
          </Surface>
        </>
      </ProGate>
    </ScrollView>
  );
}

function EmptyChart({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={styles.emptyChart}>
      <Icon source="chart-bar" size={32} color={theme.border} />
      <Text style={{ color: theme.textSecondary, marginTop: 8 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { marginBottom: 10, marginTop: 16, fontSize: 11, letterSpacing: 1 },
  emptyDonut: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 12, justifyContent: 'center', alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 20, gap: 12,
  },
  metricDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  proCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 20, marginVertical: 20,
  },
  proBtn: {
    marginTop: 12, borderRadius: 24,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  spenderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyChart: { alignItems: 'center', padding: 32 },
});
