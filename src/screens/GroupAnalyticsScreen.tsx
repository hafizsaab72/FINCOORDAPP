import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Surface, Icon, Button } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { expensesService } from '../services/expensesService';
import { Expense } from '../types';
import { apiExpenseToLocal } from '../utils/balances';
import ProGate from '../components/ProGate';
import { haptics } from '../utils/haptics';

const SCREEN_W = Dimensions.get('window').width;

const CATEGORY_COLORS = ['#A855F7', '#06B6D4', '#F59E0B', '#EC4899', '#22C55E', '#3B82F6', '#EF4444'];

export default function GroupAnalyticsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);
  const isPro = useStore(state => state.isPro);

  const groupId = route?.params?.groupId;
  const groupName = route?.params?.groupName ?? 'Group';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setIsLoading(false); return; }
    expensesService.getByGroup(groupId, 100, 0)
      .then(res => {
        const local = (res.expenses ?? []).map((e: any) => apiExpenseToLocal(e));
        setExpenses(local);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [groupId]);

  // Compute analytics from local expenses
  const analytics = useMemo(() => {
    if (!expenses?.length) return null;

    const totalSpent = expenses.reduce((s, e) => s + e.totalAmount, 0);
    const myShare = expenses.reduce((s, e) => {
      const mySplit = e.splits.find((sp: any) => sp.userId === currentUser?.id)?.computedAmount ?? 0;
      return s + mySplit;
    }, 0);

    // Category breakdown
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      catMap[cat] = (catMap[cat] ?? 0) + e.totalAmount;
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([category, amount]) => ({ category, amount, count: 0 })) // count not critical for display
      .sort((a, b) => b.amount - a.amount);

    // Top payers
    const payerMap: Record<string, number> = {};
    expenses.forEach(e => {
      e.payers.forEach((p: any) => {
        if (p.amountPaid > 0) {
          payerMap[p.userId] = (payerMap[p.userId] ?? 0) + p.amountPaid;
        }
      });
    });
    const topPayers = Object.entries(payerMap)
      .map(([payerId, amount]) => ({ payerId, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { totalSpent, myShare, categoryBreakdown, topPayers };
  }, [expenses, currentUser?.id]);

  const pieData = useMemo(() => {
    if (!analytics?.categoryBreakdown?.length) return null;
    return analytics.categoryBreakdown.map((c, idx) => ({
      value: c.amount,
      text: c.category,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [analytics]);

  const chartTotal = pieData?.reduce((s, d) => s + d.value, 0) ?? 0;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}
    >
      {/* Header */}
      <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        GROUP ANALYTICS
      </Text>
      <Text variant="headlineMedium" style={{ color: theme.text, fontWeight: '700', marginBottom: 4 }}>
        {groupName}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginBottom: 20 }}>
        {expenses?.length ?? 0} expense{expenses?.length !== 1 ? 's' : ''}
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
            <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>No expenses yet</Text>
          </View>
        )}
      </View>

      {/* Summary metrics */}
      <Surface style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        <View style={styles.metricRow}>
          <View style={[styles.metricDot, { backgroundColor: theme.primary }]} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>Total group spending</Text>
            <Text variant="headlineSmall" style={{ color: theme.primary, fontWeight: '700', marginTop: 2 }}>
              {formatAmount(analytics?.totalSpent ?? 0, currency)}
            </Text>
          </View>
        </View>
      </Surface>

      <Surface style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        <View style={styles.metricRow}>
          <View style={[styles.metricDot, { backgroundColor: theme.primary }]} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>Your share</Text>
            <Text variant="headlineSmall" style={{ color: theme.primary, fontWeight: '700', marginTop: 2 }}>
              {formatAmount(analytics?.myShare ?? 0, currency)}
            </Text>
            {analytics && analytics.totalSpent > 0 && (
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {Math.round((analytics.myShare / analytics.totalSpent) * 100)}% of group spending
              </Text>
            )}
          </View>
        </View>
      </Surface>

      {/* Pro banner */}
      {!isPro && (
        <Surface style={[styles.proCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
          <Text variant="titleMedium" style={{ color: theme.text, fontWeight: '600', textAlign: 'center' }}>
            Unlock more insights
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 4 }}>
            Category breakdown and top payers are available with OnTheTab Pro.
          </Text>
          <Button
            mode="contained"
            style={[styles.proBtn, { backgroundColor: theme.primary }]}
            onPress={() => { haptics.light(); navigation.navigate('AccountTab', { screen: 'Upgrade' }); }}
          >
            Get OnTheTab Pro
          </Button>
        </Surface>
      )}

      {/* Category breakdown — Pro */}
      <ProGate feature="Spending by Category">
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          BY CATEGORY
        </Text>
        <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
          {!pieData ? (
            <View style={styles.emptyChart}>
              <Icon source="tag-outline" size={32} color={theme.outline} />
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 8 }}>No spending data yet</Text>
            </View>
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
      </ProGate>

      {/* Top payers — Pro */}
      <ProGate feature="Top Payers">
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          TOP PAYERS
        </Text>
        <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
          {!analytics?.topPayers?.length ? (
            <View style={styles.emptyChart}>
              <Icon source="account-cash-outline" size={32} color={theme.outline} />
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 8 }}>No payer data yet</Text>
            </View>
          ) : (
            analytics.topPayers.map((p, idx) => (
              <View key={p.payerId} style={[styles.spenderRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                <View style={[styles.rankBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text variant="labelSmall" style={{ color: theme.primary, fontWeight: '700' }}>
                    #{idx + 1}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                  {p.payerId === currentUser?.id ? 'You' : `Member ${p.payerId.slice(-4)}`}
                </Text>
                <Text variant="titleSmall" style={{ color: theme.primary, fontWeight: '600' }}>
                  {formatAmount(p.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </Surface>
      </ProGate>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { marginBottom: 10, marginTop: 16, letterSpacing: 1 },
  emptyDonut: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 12, justifyContent: 'center', alignItems: 'center',
  },
  metricCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 12,
  },
  metricDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  proCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 20, marginVertical: 20,
  },
  proBtn: { marginTop: 12, borderRadius: 20 },
  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  legend: { padding: 16 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: 10,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  spenderRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyChart: {
    padding: 32, alignItems: 'center',
  },
});
