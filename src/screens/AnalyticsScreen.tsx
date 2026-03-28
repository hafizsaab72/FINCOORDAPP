import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, Icon } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import ProGate from '../components/ProGate';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;

const CATEGORY_COLORS = ['#0F7A5B', '#19A874', '#34C88A', '#FFAA00', '#FF6B35', '#6C63FF', '#FF3B30'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsScreen() {
  const { theme } = useAppTheme();
  const expenses = useStore(state => state.expenses);
  const bills = useStore(state => state.bills);
  const currency = useStore(state => state.currency);

  // --- Current month summary ---
  const now = new Date();
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const biggestExpense = expenses.reduce<null | { amount: number; notes: string }>(
    (max, e) => (!max || e.amount > max.amount ? { amount: e.amount, notes: e.notes } : max),
    null,
  );

  // --- Bar chart: last 6 months ---
  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthOffset = 5 - i;
      const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const total = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
        })
        .reduce((s, e) => s + e.amount, 0);
      return {
        value: parseFloat(total.toFixed(2)),
        label: MONTHS[targetDate.getMonth()],
        frontColor: i === 5 ? theme.primary : theme.primary + '80',
        topLabelComponent: total > 0
          ? () => (
            <Text style={{ fontSize: 8, color: theme.text, marginBottom: 2 }}>
              {total > 999 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
            </Text>
          )
          : undefined,
      };
    });
  }, [expenses, theme.primary, theme.text]);

  // --- Pie chart: by bill category ---
  const pieData = useMemo(() => {
    const catMap: Record<string, number> = {};
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
  }, [bills]);

  // --- Top spenders per group ---
  const topSpenders = useMemo(() => {
    const payerMap: Record<string, number> = {};
    for (const e of expenses) {
      payerMap[e.payerId] = (payerMap[e.payerId] || 0) + e.amount;
    }
    return Object.entries(payerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenses]);

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      {/* Summary cards — free tier */}
      <Text variant="titleSmall" style={[styles.sectionLabel, { color: '#888' }]}>
        THIS MONTH
      </Text>
      <View style={styles.tilesRow}>
        <SummaryTile
          icon="trending-up"
          label="Spent"
          value={formatAmount(thisMonthTotal, currency)}
          accent={theme.primary}
          bg={theme.surface}
          border={theme.border}
        />
        <SummaryTile
          icon="trending-down"
          label="Last Month"
          value={formatAmount(lastMonthTotal, currency)}
          accent="#FFAA00"
          bg={theme.surface}
          border={theme.border}
        />
      </View>

      {biggestExpense && (
        <Surface style={[styles.bigExpCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
          <Icon source="fire" size={18} color="#FF6B35" />
          <View style={styles.bigExpText}>
            <Text variant="bodySmall" style={{ color: '#888' }}>Biggest expense</Text>
            <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
              {biggestExpense.notes || 'Unnamed'} · {formatAmount(biggestExpense.amount, currency)}
            </Text>
          </View>
        </Surface>
      )}

      {/* Charts — Pro only */}
      <ProGate feature="Spending Charts">
        <>
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: '#888' }]}>
            MONTHLY SPENDING (LAST 6 MONTHS)
          </Text>
          <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
            {barData.every(d => d.value === 0) ? (
              <EmptyChart label="No expense data yet" theme={theme} />
            ) : (
              <BarChart
                data={barData}
                width={CHART_W - 32}
                barWidth={32}
                spacing={12}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={theme.border}
                yAxisTextStyle={{ color: '#888', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#888', fontSize: 11 }}
                noOfSections={4}
                maxValue={Math.max(...barData.map(d => d.value)) * 1.2 || 100}
                isAnimated
              />
            )}
          </Surface>

          {pieData && (
            <>
              <Text variant="titleSmall" style={[styles.sectionLabel, { color: '#888' }]}>
                BILLS BY CATEGORY
              </Text>
              <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
                <View style={styles.pieRow}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={52}
                    centerLabelComponent={() => (
                      <Text variant="labelSmall" style={{ color: theme.text, textAlign: 'center' }}>
                        {pieData.length}{'\n'}cats
                      </Text>
                    )}
                    isAnimated
                  />
                  <View style={styles.legend}>
                    {pieData.map(d => (
                      <View key={d.text} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text variant="bodySmall" style={{ color: theme.text }} numberOfLines={1}>
                          {d.text}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#888', marginLeft: 4 }}>
                          {formatAmount(d.value, currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Surface>
            </>
          )}

          {topSpenders.length > 0 && (
            <>
              <Text variant="titleSmall" style={[styles.sectionLabel, { color: '#888' }]}>
                TOP PAYERS
              </Text>
              <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
                {topSpenders.map(([payerId, total], idx) => (
                  <View key={payerId} style={[styles.spenderRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.primary + '20' }]}>
                      <Text variant="labelSmall" style={{ color: theme.primary, fontWeight: 'bold' }}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ color: theme.text, flex: 1 }}>
                      {payerId}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.primary, fontWeight: '600' }}>
                      {formatAmount(total, currency)}
                    </Text>
                  </View>
                ))}
              </Surface>
            </>
          )}
        </>
      </ProGate>
    </ScrollView>
  );
}

function SummaryTile({
  icon, label, value, accent, bg, border,
}: {
  icon: string; label: string; value: string; accent: string; bg: string; border: string;
}) {
  return (
    <Surface style={[styles.tile, { backgroundColor: bg, borderColor: border }]} elevation={0}>
      <Icon source={icon} size={22} color={accent} />
      <Text variant="bodySmall" style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color: accent, fontWeight: 'bold' }}>{value}</Text>
    </Surface>
  );
}

function EmptyChart({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={styles.emptyChart}>
      <Icon source="chart-bar" size={32} color="#ccc" />
      <Text style={{ color: '#999', marginTop: 8 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  sectionLabel: { marginBottom: 10, marginTop: 16, fontSize: 11, letterSpacing: 1 },
  tilesRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  bigExpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  bigExpText: { flex: 1 },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  spenderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyChart: { alignItems: 'center', padding: 32 },
});
