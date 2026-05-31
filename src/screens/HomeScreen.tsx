import React, { useLayoutEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Surface,
  Icon,
  IconButton,
  List,
  Button,
  Snackbar,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';
import { formatAmount, fromMinorUnits } from '../utils/currency';
import { Activity } from '../types';
import SummaryTile from '../components/SummaryTile';
import DashboardSummary from '../components/DashboardSummary';
import { useGlobalBalances } from '../hooks/useDashboard';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';
import { haptics } from '../utils/haptics';
import {
  colors as staticColors,
  spacing,
  radius,
  shadows,
} from '../theme/tokens';
import { activitiesService } from '../services/activitiesService';

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const theme = useTheme();
  const currency = useStore(state => state.currency);
  const currentUser = useStore(state => state.currentUser);

  const { data: dashboard } = useGlobalBalances();

  const expenseCount = dashboard?.summary?.expenseCount ?? 0;

  const thisMonthTotal = dashboard?.summary?.thisMonthTotal
    ? fromMinorUnits(dashboard.summary.thisMonthTotal)
    : 0;

  const [apiActivities, setApiActivities] = useState<Activity[]>([]);

  useFocusEffect(
    useCallback(() => {
      activitiesService
        .getAll(5)
        .then(res => {
          if (res?.activities) setApiActivities(res.activities);
        })
        .catch(() => {});
    }, []),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.primary}
            size={24}
            onPress={() => navigation.navigate('Activity')}
            accessibilityLabel="Activity"
          />
          {/* <IconButton
            icon="magnify"
            iconColor={theme.colors.primary}
            size={24}
            onPress={() => navigation.navigate('Search')}
          /> */}
        </View>
      ),
    });
  }, [navigation, theme.colors.primary]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.container}
      >
        {/* Hero Section — Dark Glass Card */}
        <Surface
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: 'rgba(59, 130, 246, 0.20)',
            },
          ]}
          elevation={0}
        >
          <Text
            variant="titleMedium"
            style={[
              styles.greeting,
              {
                color: theme.colors.onSurface,
                fontFamily: 'Space Grotesk',
                fontWeight: '700',
              },
            ]}
          >
            Good day
            {currentUser
              ? `, ${currentUser.name?.split(' ')[0] ?? 'User'}`
              : ''}{' '}
            👋
          </Text>

          {dashboard?.summary ? (
            <DashboardSummary
              summary={dashboard.summary}
              onPress={() =>
                navigation.navigate('GroupDetail', {
                  groupId: 'global',
                  groupName: 'All Groups',
                })
              }
            />
          ) : (
            <View style={{ marginBottom: 16 }}>
              <SummaryTile
                icon="cash-multiple"
                label="Total Spend"
                value={formatAmount(thisMonthTotal, currency)}
                type="positive"
              />
            </View>
          )}

          <View style={styles.tilesRow}>
            <SummaryTile
              icon="receipt"
              label="Expenses"
              value={`${expenseCount}`}
              type="neutral"
            />
            <SummaryTile
              icon="calendar-month"
              label="This Month"
              value={formatAmount(thisMonthTotal, currency)}
              type="positive"
            />
          </View>
        </Surface>

        {/* Analytics shortcut card */}
        <Text
          variant="titleSmall"
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.onSurface,
              fontFamily: 'Lato',
              fontWeight: '700',
            },
          ]}
        >
          Analytics
        </Text>
        <Surface
          style={[
            styles.analyticsCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          elevation={1}
        >
          <View style={styles.analyticsRow}>
            <View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                This month
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary }}
              >
                {formatAmount(thisMonthTotal, currency)}
              </Text>
            </View>
            <Icon
              source="chart-bar"
              size={36}
              color={theme.colors.primary + '50'}
            />
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

        <Text
          variant="titleSmall"
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.onSurface,
              fontFamily: 'Lato',
              fontWeight: '700',
            },
          ]}
        >
          Recent Activity
        </Text>

        {apiActivities.length === 0 ? (
          <Text style={styles.emptyText}>
            No activity yet.{'\n'}Add an expense using the + button below.
          </Text>
        ) : (
          apiActivities.slice(0, 5).map((entry: Activity) => (
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
                <View
                  style={{ alignItems: 'flex-end', justifyContent: 'center' }}
                >
                  {entry.amount !== undefined && (
                    <Text
                      variant="titleSmall"
                      style={{ color: theme.colors.onSurface }}
                    >
                      {formatAmount(entry.amount, entry.currency || currency)}
                    </Text>
                  )}
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
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
    </View>
  );
}

const getActivityIcon = (action: string) => {
  if (action.includes('Expense')) return 'cash-multiple';
  if (action.includes('Settlement')) return 'check-circle-outline';
  if (action.includes('Member')) return 'account-plus';
  if (action.includes('Group')) return 'account-group';
  return 'clock-outline';
};

const getActivityColor = (action: string, theme: any) => {
  if (action.includes('Expense')) return theme.colors.primary;
  if (action.includes('Settlement')) return theme.colors.tertiary;
  if (action.includes('Group') || action.includes('Member'))
    return theme.colors.tertiary;
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
  container: { padding: 20, paddingBottom: 140 },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  greeting: { marginBottom: 16 },
  tilesRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontFamily: 'Space Grotesk',
    fontWeight: '600',
    fontSize: 18,
  },
  analyticsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    padding: 20,
    marginBottom: 20,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { marginRight: 8, height: 36, justifyContent: 'center' },
  billRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 4,
  },
  reminderRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 4,
  },
  emptyText: { textAlign: 'center', color: '#94A3B8' },
});
