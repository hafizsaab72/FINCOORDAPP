import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Surface, Icon, Button } from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { useAnalytics } from '../hooks/useAnalytics';
import ProGate from '../components/ProGate';
import { haptics } from '../utils/haptics';

const SCREEN_W = Dimensions.get('window').width;

const CATEGORY_COLORS = ['#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#22C55E', '#EF4444'];

export default function AnalyticsScreen({ route, navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);
  const isPro = useStore(state => state.isPro);

  const friendId = route?.params?.friendId;
  const friendName = route?.params?.friendName;

  const { data, isLoading } = useAnalytics(friendId);

  const totalSpent = data?.totalSpent ?? 0;
  const yourShare = data?.yourShare ?? 0;
  const expenseCount = data?.expenseCount ?? 0;
  const percentage = totalSpent > 0 ? Math.round((yourShare / totalSpent) * 100) : 0;

  // Build pie chart data from API category breakdown
  const pieData = React.useMemo(() => {
    if (!data?.categoryBreakdown?.length) return null;
    return data.categoryBreakdown.map((c, idx) => ({
      value: c.amount,
      text: c.category,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [data]);

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
      {friendName && (
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          WITH {friendName.toUpperCase()}
        </Text>
      )}

      {/* Header */}
      <Text variant="headlineMedium" style={{ color: theme.text, fontWeight: '700', marginBottom: 4 }}>
        {friendName || 'All-time spending'}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginBottom: 20 }}>
        {expenseCount > 0 ? `${expenseCount} expense${expenseCount > 1 ? 's' : ''}` : 'No expenses yet'}
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
      <Surface style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
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
      </Surface>

      {/* Your share */}
      <Surface style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
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
              {percentage}% of total spending
            </Text>
          </View>
        </View>
      </Surface>

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
            style={[styles.proBtn, { backgroundColor: theme.primary }]}
            onPress={() => { haptics.light(); navigation.navigate('AccountTab', { screen: 'Upgrade' }); }}
          >
            Get OnTheTab Pro
          </Button>
        </Surface>
      )}

      {/* Charts — Pro only */}
      <ProGate feature="Spending Charts">
        <>
          <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
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

          <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            TOP PAYERS
          </Text>
          <Surface style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
            {(!data?.topPayers?.length) ? (
              <EmptyChart label="No payer data yet" theme={theme} />
            ) : (
              data.topPayers.map((p, idx) => (
                <View key={p.payerId} style={[styles.spenderRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <View style={[styles.rankBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text variant="labelSmall" style={{ color: theme.primary, fontWeight: '700' }}>
                      #{idx + 1}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                    {p.payerId === currentUser?.id ? 'You' : `User ${p.payerId.slice(-4)}`}
                  </Text>
                  <Text variant="titleSmall" style={{ color: theme.primary, fontWeight: '600' }}>
                    {formatAmount(p.amount, currency)}
                  </Text>
                </View>
              ))
            )}
          </Surface>
        </>
      </ProGate>
    </ScrollView>
  );
}

function EmptyChart({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={styles.emptyChart}>
      <Icon source="chart-bar" size={32} color={theme.outline} />
      <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 8 }}>{label}</Text>
    </View>
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
