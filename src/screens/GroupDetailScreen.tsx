import React, { useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, SectionList,
  ScrollView, StatusBar, Alert, ActionSheetIOS, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text, Icon, Portal, Modal, Divider,
  Button, TouchableRipple, Surface, Snackbar, List,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, expensesService, ApiGroup, ApiExpenseItem } from '../services/groupsService';
import { GroupBalancesData } from '../types';
import { groupColor } from '../constants/groupTypes';
import { getSymbol } from '../utils/currency';
import AppAvatar from '../components/AppAvatar';
import EmptyState from '../components/EmptyState';
import LoadingOverlay from '../components/LoadingOverlay';
import { haptics } from '../utils/haptics';
import { computeBalances } from '../utils/balances';

function getExpenseRole(
  expense: ApiExpenseItem,
  myId: string,
): { role: 'lent' | 'borrowed' | 'none'; amount: number } {
  // Multi-payer: sum what I paid minus what I owe
  const payments = (expense as any).payments ?? [];
  const splitDetails = expense.splitDetails ?? {};

  const myPaid = payments.reduce((s: number, p: any) =>
    p.userId === myId ? s + (p.amount || 0) : s, 0);
  const myOwed = splitDetails[myId] || 0;

  const diff = myPaid - myOwed;
  if (diff > 0.01) return { role: 'lent', amount: diff };
  if (diff < -0.01) return { role: 'borrowed', amount: Math.abs(diff) };
  return { role: 'none', amount: 0 };
}

function groupByMonth(expenses: ApiExpenseItem[]): { title: string; data: ApiExpenseItem[] }[] {
  const sections: Record<string, ApiExpenseItem[]> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!sections[key]) sections[key] = [];
    sections[key].push(e);
  }
  return Object.entries(sections).map(([title, data]) => ({ title, data }));
}



export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId, groupName: initialName } = route.params;
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const token = useStore(state => state.token);
  const myId = currentUser?.id ?? '';

  const [groupDetail, setGroupDetail] = useState<ApiGroup | null>(null);
  const [apiBalances, setApiBalances] = useState<GroupBalancesData | null>(null);
  const [apiExpenses, setApiExpenses] = useState<ApiExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [balancesModalVisible, setBalancesModalVisible] = useState(false);
  const [balancesModalTab, setBalancesModalTab] = useState<'balances' | 'simplified' | 'totals'>('balances');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const deleteExpense = useStore(state => state.deleteExpense);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [groupRes, balancesRes, expensesRes] = await Promise.allSettled([
      groupsService.getGroup(groupId),
      groupsService.getBalances(groupId),
      groupsService.getExpenses(groupId, 30, 0),
    ]);

    // Always fetch local expenses for merging
    const localStoreExpenses = useStore.getState().expenses.filter(e => e.groupId === groupId);
    const localAsApi: ApiExpenseItem[] = localStoreExpenses.map(e => ({
      _id: e.id,
      groupId: e.groupId,
      payerId: e.payerId,
      amount: e.amount,
      currency: e.currency,
      notes: e.notes,
      date: e.date,
      splitMethod: e.splitMethod,
      splitDetails: e.splitDetails,
    }));

    if (groupRes.status === 'fulfilled') setGroupDetail(groupRes.value.group);

    let mergedExpenses: ApiExpenseItem[];
    if (expensesRes.status === 'fulfilled') {
      const apiExps = expensesRes.value.expenses;
      // Merge: API expenses + local expenses not present in API
      // Deduplicate by amount+notes+date heuristic for unsynced local expenses
      const apiSet = new Set(apiExps.map(ae => ae._id));
      const unsyncedLocal = localAsApi.filter(le => {
        if (apiSet.has(le._id)) return false;
        // Check if this local expense matches any API expense by content
        return !apiExps.some(ae =>
          Math.abs(ae.amount - le.amount) < 0.01 &&
          ae.notes === le.notes &&
          Math.abs(new Date(ae.date).getTime() - new Date(le.date).getTime()) < 2000,
        );
      });
      mergedExpenses = [...apiExps, ...unsyncedLocal];
      setApiExpenses(mergedExpenses);
      setHasMore(expensesRes.value.hasMore ?? false);
    } else {
      mergedExpenses = localAsApi;
      setApiExpenses(localAsApi);
      setHasMore(false);
    }

    if (balancesRes.status === 'fulfilled') {
      setApiBalances(balancesRes.value);
    } else {
      setApiBalances(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, [currentUser, groupId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await groupsService.getExpenses(groupId, 30, apiExpenses.length);
      setApiExpenses(prev => [...prev, ...res.expenses]);
      setHasMore(res.hasMore ?? false);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [hasMore, loadingMore, groupId, apiExpenses.length]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    groupDetail?.members.forEach(m => { map[m._id] = m.name; });
    return map;
  }, [groupDetail]);

  const balances = useMemo(() => {
    return computeBalances(
      apiExpenses.map(e => ({
        payerId: e.payerId,
        amount: e.amount,
        splitMethod: e.splitMethod,
        splitDetails: e.splitDetails,
      })),
      myId,
      memberMap,
    );
  }, [apiExpenses, myId, memberMap]);

  const expenseSections = useMemo(() => groupByMonth(apiExpenses), [apiExpenses]);

  const settlementExpenses = useMemo(() => {
    return apiExpenses.filter(e => e.notes?.toLowerCase().includes('settlement') || e.splitMethod === 'custom' && Object.keys(e.splitDetails ?? {}).length === 1);
  }, [apiExpenses]);

  const group = groupDetail;
  const name = group?.name ?? initialName ?? 'Group';
  const headerColor = groupColor(groupId, group?.type);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

  const myNet = balances
    ? balances.totalOwedToYou - balances.totalYouOwe
    : 0;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <LoadingOverlay visible={true} />
      </View>
    );
  }

  const handleExpensePress = (item: ApiExpenseItem) => {
    const doEdit = () => navigation.navigate('AddExpenseModal', {
      groupId,
      editExpense: {
        id: item._id,
        amount: item.amount,
        notes: item.notes,
        currency: item.currency,
        payerId: item.payerId,
        date: item.date,
        splitMethod: item.splitMethod,
        splitDetails: item.splitDetails,
      },
    });

    const doDelete = () => {
      Alert.alert(
        'Delete Expense',
        `Delete "${item.notes || 'this expense'}" (${getSymbol(item.currency)}${item.amount.toFixed(2)})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              deleteExpense(item._id);
              setApiExpenses(prev => prev.filter(e => e._id !== item._id));

              if (token && currentUser && item._id.match(/^[a-f\d]{24}$/i)) {
                try {
                  await expensesService.delete(item._id);
                } catch {
                  setSnackbarMessage('Expense deleted locally but could not sync to server.');
                  setSnackbarVisible(true);
                  haptics.error();
                }
              }
            },
          },
        ],
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Edit Expense', 'Delete Expense'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        idx => { if (idx === 1) doEdit(); else if (idx === 2) doDelete(); },
      );
    } else {
      Alert.alert(
        item.notes || 'Expense',
        `${getSymbol(item.currency)}${item.amount.toFixed(2)}`,
        [
          { text: 'Edit', onPress: doEdit },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  const renderExpense = ({ item }: { item: ApiExpenseItem }) => {
    const { role, amount: roleAmount } = getExpenseRole(item, myId);
    const payerName = item.payerId === myId ? 'You' : (memberMap[item.payerId] ?? 'Someone');
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
          <View style={styles.expenseIconBox}>
            <Icon source="receipt" size={20} color="#666" />
          </View>

          {/* Title + subtitle */}
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseTitle, { color: theme.text }]} numberOfLines={1}>
              {item.notes || 'Expense'}
            </Text>
            <Text style={[styles.expenseSub, { color: theme.textSecondary }]}>
              {payerName} paid {expSymbol}{item.amount.toFixed(2)}
            </Text>
          </View>

          {/* Role label + amount */}
          <View style={styles.expenseRight}>
            {role === 'lent' && (
              <>
                <Text style={[styles.roleLabel, { color: theme.success }]}>you lent</Text>
                <Text style={[styles.roleAmount, { color: theme.success }]}>
                  {expSymbol}{roleAmount.toFixed(2)}
                </Text>
              </>
            )}
            {role === 'borrowed' && (
              <>
                <Text style={[styles.roleLabel, { color: theme.warning }]}>you borrowed</Text>
                <Text style={[styles.roleAmount, { color: theme.warning }]}>
                  {expSymbol}{roleAmount.toFixed(2)}
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
    { label: 'Charts', icon: 'chart-bar', filled: false, onPress: () => { haptics.light(); navigation.navigate('Analytics'); }},
    { label: 'Balances', icon: 'scale-balance', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('balances'); setBalancesModalVisible(true); }},
    { label: 'Simplified', icon: 'lightbulb-on', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('simplified'); setBalancesModalVisible(true); }},
    { label: 'Totals', icon: 'sigma', filled: false, onPress: () => { haptics.light(); setBalancesModalTab('totals'); setBalancesModalVisible(true); }},
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed colored header */}
      <Surface elevation={2} style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => {
              // @ts-ignore popTo available in native-stack v6.7+/v7
              if (navigation.popTo) {
                navigation.popTo('Groups');
              } else {
                navigation.goBack();
              }
            }}
          >
            <Icon source="chevron-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => navigation.navigate('GroupSettings', { groupId, groupName: name })}
          >
            <Icon source="cog-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: '#FFF' }]} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.headerMeta}>
          {group?.startDate && (
            <View style={styles.metaChip}>
              <Icon source="calendar-range" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaChipText}>
                {new Date(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {group.endDate ? ` – ${new Date(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Icon source="account-multiple-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.metaChipText}>{group?.members.length ?? 0} people</Text>
          </View>
        </View>
      </Surface>

      <SectionList
        style={{ flex: 1 }}
        sections={[
          {
            title: '__balance',
            data: [] as ApiExpenseItem[],
          },
          ...expenseSections,
        ]}
        keyExtractor={(item, index) => item._id ?? `empty-${index}`}
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
                      <Icon source="information-outline" size={16} color={theme.textSecondary} />
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
                          ? { backgroundColor: '#E8673A', borderColor: '#E8673A' }
                          : { backgroundColor: theme.background, borderColor: theme.border },
                      ]}
                      onPress={btn.onPress}
                      activeOpacity={0.7}
                    >
                      <Icon source={btn.icon} size={16} color={btn.filled ? '#FFF' : theme.text} />
                      <Text style={[styles.actionPillText, { color: btn.filled ? '#FFF' : theme.text }]}>
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
                      <View key={e._id ?? i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Icon source="check-circle-outline" size={14} color={theme.success} />
                        <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>
                          {e.notes || 'Settlement'} — {getSymbol(e.currency)}{e.amount.toFixed(2)}
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
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
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
                                {symbol}{tx.amount.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginLeft: 46 }}>
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => {
                              Alert.alert('Remind', `Send a payment reminder to ${tx.fromName}?`, [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Send',
                                  onPress: async () => {
                                    try {
                                      const { friendsService } = await import('../services/friendsService');
                                      await friendsService.remind(tx.from);
                                      setSnackbarMessage(`Reminder sent to ${tx.fromName}`);
                                      setSnackbarVisible(true);
                                      haptics.success();
                                    } catch {
                                      setSnackbarMessage('Could not send reminder. Make sure you are friends with this user.');
                                      setSnackbarVisible(true);
                                      haptics.error();
                                    }
                                  },
                                },
                              ]);
                            }}
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
                  { label: 'Total spent', value: `${symbol}${apiExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}` },
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

      {/* Floating pills */}
      <View style={[styles.fabContainer, { bottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity
          style={[styles.fabPill, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => navigation.navigate('QRScanner')}
          activeOpacity={0.7}
        >
          <Icon source="camera-outline" size={20} color={theme.text} />
          <Text style={[styles.fabPillText, { color: theme.text }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabPill, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => navigation.navigate('AddExpenseModal', { groupId })}
          activeOpacity={0.7}
        >
          <Icon source="receipt" size={20} color="#FFF" />
          <Text style={[styles.fabPillText, { color: '#FFF' }]}>Add expense</Text>
        </TouchableOpacity>
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, marginBottom: 16,
  },
  headerCircleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32, fontWeight: '700',
    paddingHorizontal: 20, marginBottom: 12,
  },
  headerMeta: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  metaChipText: { color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  // Balance section
  balanceSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  balanceOverall: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  memberBalanceRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6,
  },
  memberBalanceText: { fontSize: 15 },
  memberBalanceAmount: { fontWeight: '600' },

  // Action pills
  actionRow: {
    flexDirection: 'row', gap: 8,
    paddingTop: 16, paddingBottom: 8,
  },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  actionPillText: { fontSize: 14, fontWeight: '600' },

  // Expense list
  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateCol: { width: 36, alignItems: 'center' },
  dateMonth: { fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  dateDay: { fontSize: 16, fontWeight: '500', lineHeight: 20 },
  expenseIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center', alignItems: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '500' },
  expenseSub: { fontSize: 13, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', minWidth: 90 },
  roleLabel: { fontSize: 12, fontWeight: '500' },
  roleAmount: { fontSize: 15, fontWeight: '700' },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: '700' },

  // Floating pills
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 24, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  fabPillText: { fontSize: 15, fontWeight: '600' },

  // Load more
  loadMoreBtn: {
    margin: 16, borderRadius: 12, borderWidth: 1,
    paddingVertical: 12, alignItems: 'center',
  },
  loadMoreText: { fontWeight: '600', fontSize: 14 },

  // Balances modal
  balModal: {
    marginHorizontal: 16, borderRadius: 16, padding: 20,
  },
  balModalTabs: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  balModalTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2,
  },
  simplifyBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginTop: 8,
  },
  balModalClose: {
    marginTop: 20, borderRadius: 12,
  },
  totalsRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
  },
});
