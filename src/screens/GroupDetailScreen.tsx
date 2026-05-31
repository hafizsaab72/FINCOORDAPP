import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View, StyleSheet, SectionList,
  ScrollView, StatusBar, Alert, ActionSheetIOS, Platform, TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import {
  Text, Icon, Portal, Modal, Divider,
  Button, TouchableRipple, Surface, Snackbar, List, IconButton, FAB,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useGroupBalances } from '../hooks/useBalances';
import { queryClient } from '../../App';
import { useStore } from '../store/useStore';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup } from '../services/groupsService';
import { expensesService } from '../services/expensesService';
import { Expense, GroupBalancesData } from '../types';
import { groupColor, getGroupIconConfig } from '../constants/groupTypes';
import { getSymbol, fromMinorUnits } from '../utils/currency';
import { colors as staticColors, spacing, radius, shadows, componentTokens } from '../theme/tokens';
import { apiExpenseToLocal } from '../utils/balances';
import AppAvatar from '../components/AppAvatar';
import EmptyState from '../components/EmptyState';
import LoadingOverlay from '../components/LoadingOverlay';
import { haptics } from '../utils/haptics';
import { computeBalances } from '../utils/balances';

function getExpenseRole(
  expense: Expense,
  myId: string,
): { role: 'lent' | 'borrowed' | 'none'; amount: number } {
  const payments = expense.payers;
  const splits = expense.splits;

  const myPaid = payments.reduce((s, p) =>
    p.userId === myId ? s + (p.amountPaid || 0) : s, 0);
  const myOwed = splits.reduce((s, sp) =>
    sp.userId === myId ? s + (sp.computedAmount || 0) : s, 0);

  const diff = myPaid - myOwed;
  if (diff > 0.01) return { role: 'lent', amount: diff };
  if (diff < -0.01) return { role: 'borrowed', amount: Math.abs(diff) };
  return { role: 'none', amount: 0 };
}

function groupByMonth(expenses: Expense[]): { title: string; data: Expense[] }[] {
  const sections: Record<string, Expense[]> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!sections[key]) sections[key] = [];
    sections[key].push(e);
  }
  return Object.entries(sections).map(([title, data]) => ({ title, data }));
}



export default function GroupDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { groupId, groupName: initialName, groupIcon: initialIcon, groupImage: initialImage } = route.params;
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const token = useStore(state => state.token);
  const myId = currentUser?.id ?? '';

  const [groupDetail, setGroupDetail] = useState<ApiGroup | null>(null);
  const [apiExpenses, setApiExpenses] = useState<Expense[]>([]);

  const { data: apiBalances } = useGroupBalances(groupId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [balancesModalVisible, setBalancesModalVisible] = useState(false);
  const [balancesModalTab, setBalancesModalTab] = useState<'balances' | 'simplified' | 'totals'>('balances');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [expenseActionModalVisible, setExpenseActionModalVisible] = useState(false);
  const [expenseActionModalData, setExpenseActionModalData] = useState<{ expense: Expense; action: 'edit' | 'delete' } | null>(null);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderModalData, setReminderModalData] = useState<{ from: string; fromName: string } | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [groupRes, expensesRes] = await Promise.allSettled([
      groupsService.getGroup(groupId),
      expensesService.getByGroup(groupId, 30, 0),
    ]);

    // Always fetch local expenses for merging
    const localStoreExpenses: Expense[] = []; // Local-only expenses removed from store in refactor

    if (groupRes.status === 'fulfilled') {
      setGroupDetail(groupRes.value.group);
    }

    // Build a local member map from the group response for name resolution
    const localMemberMap: Record<string, string> = {};
    if (groupRes.status === 'fulfilled') {
      (groupRes.value.group as any).members?.forEach((m: any) => {
        localMemberMap[m._id] = m.name;
      });
    }

    let mergedExpenses: Expense[];
    if (expensesRes.status === 'fulfilled') {
      const apiExps: Expense[] = expensesRes.value.expenses.map((e: any) => {
        const local = apiExpenseToLocal(e);
        // Fill in missing participant names from group member map
        if (Object.keys(localMemberMap).length > 0) {
          local.participants = local.participants.map(p => ({
            ...p,
            name: p.name || localMemberMap[p.userId] || p.userId,
          }));
        }
        return local;
      });
      // Merge: API expenses + local expenses not present in API
      // Deduplicate by amount+title+date heuristic for unsynced local expenses
      const apiSet = new Set(apiExps.map(ae => ae.id));
      const unsyncedLocal = localStoreExpenses.filter(le => {
        if (apiSet.has(le.id)) return false;
        // Check if this local expense matches any API expense by content
        return !apiExps.some(ae =>
          Math.abs(ae.totalAmount - le.totalAmount) < 0.01 &&
          ae.title === le.title &&
          Math.abs(new Date(ae.date).getTime() - new Date(le.date).getTime()) < 2000,
        );
      });
      mergedExpenses = [...apiExps, ...unsyncedLocal];
      setApiExpenses(mergedExpenses);
      setHasMore(expensesRes.value.hasMore ?? false);
    } else {
      mergedExpenses = localStoreExpenses;
      setApiExpenses(localStoreExpenses);
      setHasMore(false);
    }

    setLoading(false);
    setRefreshing(false);
  }, [currentUser, groupId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await expensesService.getByGroup(groupId, 30, apiExpenses.length);
      const newExpenses = res.expenses.map(apiExpenseToLocal);
      setApiExpenses(prev => [...prev, ...newExpenses]);
      setHasMore(res.hasMore ?? false);
      // Refresh balances to reflect newly loaded expenses
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [hasMore, loadingMore, groupId, apiExpenses.length]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    groupDetail?.members.forEach(m => { map[m._id] = m.name; });
    // Also resolve names from expenses (for removed members who still appear in old expenses)
    apiExpenses.forEach(e => {
      e.payers?.forEach(p => {
        if (!map[p.userId] && p.userId === currentUser?.id) map[p.userId] = currentUser?.name ?? 'You';
      });
      e.splits?.forEach(s => {
        if (!map[s.userId] && s.userId === currentUser?.id) map[s.userId] = currentUser?.name ?? 'You';
      });
    });
    // Include former member names from API balances if available
    apiBalances?.memberBalances?.forEach(mb => {
      if (!map[mb.memberId]) map[mb.memberId] = mb.name;
    });
    return map;
  }, [groupDetail, apiExpenses, apiBalances, currentUser]);

  const balances = useMemo(() => {
    // Prefer API balances when available (accurate server-side computation)
    if (apiBalances?.memberBalances?.length) {
      const myBalance = apiBalances.memberBalances.find(m => m.isMe);
      const myNet = fromMinorUnits(myBalance?.net ?? 0);
      return {
        totalOwedToYou: fromMinorUnits(apiBalances.totalOwedToYou ?? 0),
        totalYouOwe: fromMinorUnits(apiBalances.totalYouOwe ?? 0),
        memberBalances: apiBalances.memberBalances.map(m => ({
          ...m,
          net: fromMinorUnits(m.net),
        })),
      };
    }
    // Fallback to client-side computation from expenses
    return computeBalances(
      apiExpenses.map(e => ({
        payments: e.payers.map(p => ({ userId: p.userId, amount: p.amountPaid })),
        splits: e.splits.map(s => ({ userId: s.userId, owedAmount: s.computedAmount })),
        participantNames: memberMap,
      })),
      myId,
      memberMap,
    );
  }, [apiBalances, apiExpenses, myId, memberMap]);

  const expenseSections = useMemo(() => groupByMonth(apiExpenses), [apiExpenses]);

  const settlementExpenses = useMemo(() => {
    return apiExpenses.filter(e => e.isSettlement);
  }, [apiExpenses]);

  const group = groupDetail;
  const name = group?.name ?? initialName ?? 'Group';
  const headerColor = groupColor(groupId, group?.type);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

  const myNet = balances
    ? balances.totalOwedToYou - balances.totalYouOwe
    : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: name,
      headerRight: () => (
        <IconButton
          icon="cog-outline"
          iconColor={colors.white}
          size={22}
          onPress={() => navigation.navigate('GroupSettings', { groupId, groupName: name })}
          style={{ marginRight: 4 }}
        />
      ),
    });
  }, [navigation, name, groupId, colors.white]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <LoadingOverlay visible={true} />
      </View>
    );
  }

  const handleExpensePress = (item: Expense) => {
    setExpenseActionModalData({ expense: item, action: 'edit' });
    setExpenseActionModalVisible(true);
  };

  const handleExpenseEdit = () => {
    if (!expenseActionModalData) return;
    setExpenseActionModalVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('AddExpense', { expenseId: expenseActionModalData.expense.id });
    } else {
      navigation.navigate('AddExpense', { expenseId: expenseActionModalData.expense.id });
    }
  };

  const handleExpenseDelete = async () => {
    if (!expenseActionModalData) return;
    try {
      await expensesService.delete(expenseActionModalData.expense.id);
      setApiExpenses(prev => prev.filter(e => e.id !== expenseActionModalData!.expense.id));
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    } catch {
      setSnackbarMessage('Could not delete expense. Please check your connection and try again.');
      setSnackbarVisible(true);
      haptics.error();
    }
    setExpenseActionModalVisible(false);
  };

  const handleRemindPress = (from: string, fromName: string) => {
    setReminderModalData({ from, fromName });
    setReminderModalVisible(true);
  };

  const handleSendReminder = async () => {
    if (!reminderModalData) return;
    try {
      const { friendsService } = await import('../services/friendsService');
      await friendsService.remind(reminderModalData.from);
      setSnackbarMessage(`Reminder sent to ${reminderModalData.fromName}`);
      setSnackbarVisible(true);
      haptics.success();
    } catch {
      setSnackbarMessage('Make sure you are friends with this user.');
      setSnackbarVisible(true);
      haptics.error();
    }
    setReminderModalVisible(false);
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const { role, amount: roleAmount } = getExpenseRole(item, myId);
    const primaryPayer = item.payers[0];
    const payerName = primaryPayer?.userId === myId ? 'You' : (memberMap[primaryPayer?.userId ?? ''] ?? 'Someone');
    const expSymbol = getSymbol(item.currency);
    const date = new Date(item.date);
    const day = date.getDate();
    const monthShort = date.toLocaleString('en-US', { month: 'short' });

    return (
      <TouchableRipple
        onPress={() => handleExpensePress(item)}
        style={[styles.expenseRow, { borderBottomColor: theme.border }]}
      >
        <>
          {/* Date column */}
          <View style={styles.dateCol}>
            <Text style={[styles.dateMonth, { color: theme.textSecondary }]}>
              {monthShort}
            </Text>
            <Text style={[styles.dateDay, { color: theme.text }]}>
              {day}
            </Text>
          </View>

          {/* Icon */}
          <View style={[styles.expenseIconBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Icon source="receipt" size={20} color={colors.textTertiary} />
          </View>

          {/* Title + subtitle */}
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title || 'Expense'}
            </Text>
            <Text style={[styles.expenseSub, { color: theme.textSecondary }]}>
              {payerName} paid {expSymbol}{(item.totalAmount ?? 0).toFixed(2)}
            </Text>
          </View>

          {/* Role label + amount */}
          <View style={styles.expenseRight}>
            {role === 'lent' && (
              <>
                <Text style={[styles.roleLabel, { color: theme.success }]}>you lent</Text>
                <Text style={[styles.roleAmount, { color: theme.success }]}>
                  {expSymbol}{(roleAmount ?? 0).toFixed(2)}
                </Text>
              </>
            )}
            {role === 'borrowed' && (
              <>
                <Text style={[styles.roleLabel, { color: theme.warning }]}>you borrowed</Text>
                <Text style={[styles.roleAmount, { color: theme.warning }]}>
                  {expSymbol}{(roleAmount ?? 0).toFixed(2)}
                </Text>
              </>
            )}
            {role === 'none' && (
              <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>no balance</Text>
            )}
          </View>
        </>
      </TouchableRipple>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.text }]}>{section.title}</Text>
    </View>
  );

  const actionButtons = [
    { label: 'Settle up', icon: 'account-check', filled: true, onPress: () => {
      haptics.success();
      navigation.navigate('SettleUpModal', { groupId, groupName: name, members: balances?.memberBalances ?? [] });
    }},
    { label: 'Charts', icon: 'chart-bar', filled: false, onPress: () => { haptics.light(); navigation.navigate('GroupAnalytics', { groupId, groupName: name }); }},
    { label: 'Balances', icon: 'scale-balance', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('balances'); setBalancesModalVisible(true); }},
    { label: 'Simplified', icon: 'lightbulb-on', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('simplified'); setBalancesModalVisible(true); }},
    { label: 'Totals', icon: 'sigma', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('totals'); setBalancesModalVisible(true); }},
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed colored header */}
      <Surface elevation={2} style={[styles.header, { backgroundColor: colors.bgHeaderStart, paddingTop: insets.top + spacing[3] }]}>
        <View style={styles.headerTop}>
          {(group?.image || initialImage) ? (
            <Image source={{ uri: group?.image || initialImage }} style={[styles.groupAvatar, { backgroundColor: colors.accentPrimary }]} />
          ) : (
            <View style={[styles.groupAvatar, { backgroundColor: colors.accentPrimary, ...shadows.glowPurple }]}>
              {(group?.icon || initialIcon) ? (
                <Icon source={getGroupIconConfig(group?.icon || initialIcon).icon} size={32} color={colors.white} />
              ) : (
                <Text style={[styles.groupAvatarText, { color: colors.white }]}>
                  {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: colors.white }]} numberOfLines={1}>
          {name}
        </Text>

        {/* Member avatar row */}
        {groupDetail?.members && groupDetail.members.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberAvatarRow}>
            {groupDetail.members.map((m, i) => (
              <View
                key={m._id}
                style={[
                  styles.memberAvatarCircle,
                  { backgroundColor: colors.bgElevated, marginLeft: i > 0 ? -10 : 0, zIndex: groupDetail.members.length - i },
                ]}
              >
                {m.profilePic ? (
                  <Image source={{ uri: m.profilePic }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                ) : (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {(m.name?.[0] ?? '?').toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.headerMeta}>
          {group?.startDate && (
            <View style={[styles.metaChip, { backgroundColor: colors.bgElevated }]}>
              <Icon source="calendar-range" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                {new Date(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {group.endDate ? ` – ${new Date(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </Text>
            </View>
          )}
          <View style={[styles.metaChip, { backgroundColor: colors.bgElevated }]}>
            <Icon source="account-multiple-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{group?.members.length ?? 0} people</Text>
          </View>
        </View>
      </Surface>

      <SectionList
        style={{ flex: 1 }}
        sections={[
          {
            title: '__balance',
            data: [] as Expense[],
          },
          ...expenseSections,
        ]}
        keyExtractor={(item, index) => item.id ?? `empty-${index}`}
        renderItem={({ item, section }) => {
          if (section.title === '__balance') return null;
          return renderExpense({ item });
        }}
        renderSectionHeader={({ section }) => {
          if (section.title === '__balance') {
            return (
              <View style={[styles.balanceSection, { backgroundColor: theme.background }]}>
                {/* Overall balance */}
                <Text style={[styles.balanceOverall, { color: theme.text }]}>
                  {Math.abs(myNet) < 0.005
                    ? 'You are settled up in this group'
                    : myNet > 0
                    ? `You are owed ${symbol}${myNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} overall`
                    : `You owe ${symbol}${Math.abs(myNet).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} overall`}
                </Text>

                {/* Individual debt lines */}
                {balances?.memberBalances
                  .filter(m => !m.isMe && Math.abs(m.net) > 0.005)
                  .map(m => (
                    <View key={m.memberId} style={styles.memberBalanceRow}>
                      <Text style={[styles.memberBalanceText, { color: theme.text }]}>
                        {m.net > 0 ? `${m.name} owes you` : `You owe ${m.name}`}{' '}
                        <Text style={[styles.memberBalanceAmount, { color: m.net > 0 ? theme.success : theme.warning }]}>
                          {symbol}{Math.abs(m.net).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Text>
                    </View>
                  ))}

                {/* Action buttons */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.actionRow}
                >
                  {actionButtons.map((btn, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.actionPill,
                        btn.filled
                          ? { backgroundColor: colors.debt, borderColor: colors.debt }
                          : { backgroundColor: colors.surfacePrimary, borderColor: colors.borderDefault },
                      ]}
                      onPress={btn.onPress}
                      activeOpacity={0.7}
                    >
                      <Icon source={btn.icon} size={16} color={btn.filled ? colors.white : colors.textPrimary} />
                      <Text style={[styles.actionPillText, { color: btn.filled ? colors.white : colors.textPrimary }]}>
                        {btn.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Settlement history */}
                {settlementExpenses.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.sectionHeaderText, { color: theme.textSecondary, fontSize: 13, marginBottom: 6 }]}>
                      Settlement history
                    </Text>
                    {settlementExpenses.slice(0, 3).map((e, i) => (
                      <View key={e.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Icon source="check-circle-outline" size={14} color={theme.success} />
                        <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>
                          {e.title || 'Settlement'} — {getSymbol(e.currency)}{e.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                    {settlementExpenses.length > 3 && (
                      <Text style={{ color: theme.primary, fontSize: 12 }}>
                        +{settlementExpenses.length - 3} more settlements
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          }
          return renderSectionHeader({ section });
        }}
        renderSectionFooter={({ section }) => {
          if (section.title === '__balance') return null;
          return null;
        }}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title="No expenses yet."
            subtitle="Tap + to add the first one."
          />
        }
        ListFooterComponent={
          hasMore ? (
            <Button
              mode="outlined"
              onPress={loadMore}
              disabled={loadingMore}
              loading={loadingMore}
              style={[styles.loadMoreBtn, { borderColor: theme.border }]}
              textColor={theme.primary}
              labelStyle={styles.loadMoreText}
            >
              Load more
            </Button>
          ) : null
        }
        refreshing={refreshing}
        onRefresh={() => fetchAll(true)}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        stickySectionHeadersEnabled={false}
      />

      {/* Balances Modal */}
      <Portal>
        <Modal
          visible={balancesModalVisible}
          onDismiss={() => setBalancesModalVisible(false)}
          contentContainerStyle={[styles.balModal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleLarge" style={{ color: theme.text, marginBottom: 4 }}>
            Group balances
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: 12 }}>
            {name}
          </Text>

          <View style={[styles.balModalTabs, { borderBottomColor: theme.border }]}>
            {(['balances', 'simplified', 'totals'] as const).map(tab => (
              <TouchableRipple
                key={tab}
                style={[
                  styles.balModalTab,
                  { borderBottomColor: balancesModalTab === tab ? theme.primary : 'transparent' },
                ]}
                onPress={() => setBalancesModalTab(tab)}
              >
                <Text
                  variant="labelLarge"
                  style={{
                    color: balancesModalTab === tab ? theme.primary : theme.textSecondary,
                    textTransform: 'capitalize',
                  }}>
                  {tab}
                </Text>
              </TouchableRipple>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {balancesModalTab === 'balances' ? (
              <>
                {!balances || balances.memberBalances.filter(m => !m.isMe).length === 0 ? (
                  <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
                    Everyone is settled up!
                  </Text>
                ) : (
                  balances.memberBalances.filter(m => !m.isMe).map((m, i) => (
                    <React.Fragment key={m.memberId}>
                      {i > 0 && <Divider />}
                      <List.Item
                        title={m.name}
                        titleStyle={{ color: theme.text }}
                        left={() => <AppAvatar user={{ name: m.name, _id: m.memberId }} size={36} />}
                        right={() => (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text variant="bodySmall" style={{ color: m.net > 0.005 ? theme.success : m.net < -0.005 ? theme.error : theme.textSecondary }}>
                                {m.net > 0.005 ? 'owes you' : m.net < -0.005 ? 'you owe' : 'settled'}
                              </Text>
                              {Math.abs(m.net) > 0.005 && (
                                <Text variant="titleMedium" style={{ color: m.net > 0 ? theme.success : theme.error }}>
                                  {symbol}{Math.abs(m.net).toFixed(2)}
                                </Text>
                              )}
                            </View>
                            {m.net < -0.005 && (
                              <Button
                                mode="contained"
                                compact
                                buttonColor={theme.error}
                                onPress={() => {
                                  haptics.success();
                                  setBalancesModalVisible(false);
                                  navigation.navigate('SettleUpModal', {
                                    groupId, groupName: name,
                                    members: balances?.memberBalances ?? [],
                                    preselectedMemberId: m.memberId,
                                  });
                                }}
                              >
                                Settle
                              </Button>
                            )}
                          </View>
                        )}
                      />
                    </React.Fragment>
                  ))
                )}
              </>
            ) : balancesModalTab === 'simplified' ? (
              <>
                {!apiBalances?.simplifiedTransactions || apiBalances.simplifiedTransactions.length === 0 ? (
                  <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
                    {groupDetail?.simplifyDebts
                      ? 'Everyone is settled up!'
                      : 'Enable "Simplify debts" in group settings to see the optimal payment plan.'}
                  </Text>
                ) : (
                  <>
                    {apiBalances.simplifiedTransactions.map((tx, i) => (
                      <React.Fragment key={`${tx.from}-${tx.to}-${i}`}>
                        {i > 0 && <Divider />}
                        <List.Item
                          title={tx.fromName}
                          description={`pays ${tx.toName}`}
                          titleStyle={{ color: theme.text }}
                          descriptionStyle={{ color: theme.textSecondary }}
                          left={() => <AppAvatar user={{ name: tx.fromName }} size={36} />}
                          right={() => (
                            <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginRight: 8 }}>
                              <Text variant="titleMedium" style={{ color: theme.error }}>
                                {symbol}{fromMinorUnits(tx.amount).toFixed(2)}
                              </Text>
                            </View>
                          )}
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginLeft: 46 }}>
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => handleRemindPress(tx.from, tx.fromName)}
                          >
                            Remind...
                          </Button>
                          <Button
                            mode="contained"
                            compact
                            buttonColor={theme.error}
                            onPress={() => {
                              haptics.success();
                              setBalancesModalVisible(false);
                              navigation.navigate('SettleUpModal', {
                                groupId, groupName: name,
                                members: balances?.memberBalances ?? [],
                                preselectedMemberId: tx.from,
                              });
                            }}
                          >
                            Settle up
                          </Button>
                        </View>
                      </React.Fragment>
                    ))}
                    <View style={[styles.simplifyBanner, { backgroundColor: theme.primary + '12' }]}>
                      <Icon source="lightbulb-on-outline" size={18} color={theme.primary} />
                      <Text variant="bodySmall" style={{ color: theme.primary, flex: 1, marginLeft: 8 }}>
                        Simplify debts is on, saving your group {apiBalances!.simplifiedTransactions!.length} repayments
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View style={{ gap: 10 }}>
                {[
                  { label: 'Transactions', value: String(apiExpenses.length) },
                  { label: 'Total spent', value: `${symbol}${apiExpenses.reduce((s, e) => s + e.totalAmount, 0).toFixed(2)}` },
                  { label: 'You are owed', value: `${symbol}${(balances?.totalOwedToYou ?? 0).toFixed(2)}` },
                  { label: 'You owe', value: `${symbol}${(balances?.totalYouOwe ?? 0).toFixed(2)}` },
                ].map(row => (
                  <View key={row.label} style={styles.totalsRow}>
                    <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>{row.label}</Text>
                    <Text variant="titleMedium" style={{ color: theme.text }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <Button
            mode="contained"
            style={styles.balModalClose}
            onPress={() => setBalancesModalVisible(false)}
          >
            Close
          </Button>
        </Modal>
      </Portal>

      {/* FABs */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET }]} pointerEvents="box-none">
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[styles.fabScan, { backgroundColor: theme.surface + 'CC', borderWidth: 1, borderColor: theme.outlineVariant + '60' }]}
          color={theme.textSecondary}
          onPress={() => { haptics.medium(); navigation.navigate('QRScanner'); }}
        />
        <FAB
          icon="plus"
          style={[
            styles.fabAdd,
            {
              backgroundColor: theme.primary,
              borderRadius: 16,
              ...Platform.select({
                ios: { shadowColor: theme.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
                android: {},
              }),
            },
          ]}
          color="#FFFFFF"
          onPress={() => {
            haptics.medium();
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('AddExpense', { groupId });
            } else {
              navigation.navigate('AddExpense', { groupId });
            }
          }}
        />
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* Expense Action Modal */}
      <Portal>
        <Modal
          visible={expenseActionModalVisible}
          onDismiss={() => setExpenseActionModalVisible(false)}
          contentContainerStyle={[styles.actionModal, { backgroundColor: theme.surface }]}
        >
          {expenseActionModalData && (
            <>
              <View style={styles.actionModalHeader}>
                <View style={[styles.actionModalIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon source="receipt" size={24} color={theme.primary} />
                </View>
                <View style={styles.actionModalInfo}>
                  <Text style={[styles.actionModalTitle, { color: theme.text }]}>
                    {expenseActionModalData.expense.title || 'Expense'}
                  </Text>
                  <Text style={[styles.actionModalSubtitle, { color: theme.textSecondary }]}>
                    {getSymbol(expenseActionModalData.expense.currency)}{fromMinorUnits(expenseActionModalData.expense.totalAmount ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.actionModalButtons}>
                <Button
                  mode="outlined"
                  onPress={handleExpenseEdit}
                  style={[styles.actionModalBtn, { borderColor: theme.border }]}
                  labelStyle={{ color: theme.text }}
                  icon="pencil"
                >
                  Edit
                </Button>
                <Button
                  mode="contained"
                  onPress={handleExpenseDelete}
                  buttonColor={theme.error}
                  textColor="#FFFFFF"
                  style={styles.actionModalBtn}
                  icon="delete"
                >
                  Delete
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      {/* Reminder Modal */}
      <Portal>
        <Modal
          visible={reminderModalVisible}
          onDismiss={() => setReminderModalVisible(false)}
          contentContainerStyle={[styles.actionModal, { backgroundColor: theme.surface }]}
        >
          {reminderModalData && (
            <>
              <View style={styles.actionModalHeader}>
                <View style={[styles.actionModalIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon source="bell" size={24} color={theme.primary} />
                </View>
                <View style={styles.actionModalInfo}>
                  <Text style={[styles.actionModalTitle, { color: theme.text }]}>
                    Send Reminder
                  </Text>
                  <Text style={[styles.actionModalSubtitle, { color: theme.textSecondary }]}>
                    {reminderModalData.fromName}
                  </Text>
                </View>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginBottom: 8 }}>
                Send a payment reminder to {reminderModalData.fromName}?
              </Text>
              <View style={styles.actionModalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setReminderModalVisible(false)}
                  style={[styles.actionModalBtn, { borderColor: theme.border }]}
                  labelStyle={{ color: theme.text }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSendReminder}
                  buttonColor={theme.primary}
                  textColor="#FFFFFF"
                  style={styles.actionModalBtn}
                  icon="send"
                >
                  Send
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { paddingBottom: spacing[5] },
  headerTop: {
    alignItems: 'center',
    paddingHorizontal: spacing[3], marginBottom: spacing[3],
  },
  headerCircleBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: staticColors.surfaceHover,
    justifyContent: 'center', alignItems: 'center',
  },
  groupAvatar: {
    width: 48, height: 48, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  groupAvatarText: { fontSize: 18, fontWeight: '700' },
  headerTitle: {
    fontSize: 32, fontWeight: '700',
    paddingHorizontal: spacing[5], marginBottom: spacing[3],
  },
  headerMeta: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[5], flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
  },
  metaChipText: { fontWeight: '500' },

  // Balance section
  balanceSection: { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] },
  balanceOverall: { fontSize: 20, fontWeight: '600', marginBottom: spacing[2] },
  memberBalanceRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], gap: spacing[1],
  },
  memberBalanceText: { fontSize: 15 },
  memberBalanceAmount: { fontWeight: '600' },

  // Action pills
  actionRow: {
    flexDirection: 'row', gap: spacing[2],
    paddingTop: spacing[4], paddingBottom: spacing[2],
  },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: spacing[2], paddingVertical: spacing[1],
  },
  actionPillText: { fontSize: 13, fontWeight: '600' },

  // Expense list
  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[3],
    borderRadius: radius.lg,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  dateCol: { width: 40, alignItems: 'center' },
  dateMonth: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.05 },
  dateDay: { fontSize: 18, fontWeight: '600', lineHeight: 22 },
  expenseIconBox: {
    width: 44, height: 44, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  expenseSub: { fontSize: 13 },
  expenseRight: { alignItems: 'flex-end', minWidth: 90 },
  roleLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 2 },
  roleAmount: { fontSize: 16, fontWeight: '700' },

  sectionHeader: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.08 },

  // Floating pills
  fabContainer: {
    position: 'absolute', right: spacing[4],
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
  },
  fabPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    shadowColor: staticColors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  fabPillText: { fontSize: 15, fontWeight: '600' },

  // Load more
  loadMoreBtn: {
    margin: spacing[4], borderRadius: radius.lg, borderWidth: 1,
    paddingVertical: spacing[3], alignItems: 'center',
  },
  loadMoreText: { fontWeight: '600', fontSize: 14 },

  // Balances modal
  balModal: {
    marginHorizontal: spacing[4], borderRadius: radius.xl, padding: spacing[5],
  },
  balModalTabs: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing[3],
  },
  balModalTab: {
    flex: 1, paddingVertical: spacing[2], alignItems: 'center',
    borderBottomWidth: 2,
  },
  simplifyBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing[3], borderRadius: radius.lg, marginTop: spacing[2],
  },
  balModalClose: {
    marginTop: spacing[5], borderRadius: radius.lg,
  },
  totalsRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2],
  },

  // Member avatar row in header
  memberAvatarRow: {
    flexDirection: 'row',
    marginTop: spacing[3],
    marginBottom: spacing[1],
    paddingHorizontal: spacing[4],
  },
  memberAvatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    borderColor: staticColors.white,
  },

  // Expense action modal
  actionModal: {
    marginHorizontal: 32, borderRadius: 20, padding: 24,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  actionModalIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  actionModalInfo: { flex: 1 },
  actionModalTitle: { fontWeight: '700', fontSize: 18 },
  actionModalSubtitle: { marginTop: 2, opacity: 0.7 },
  actionModalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionModalBtn: { flex: 1, borderRadius: 12 },
});
