import React, { useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, SectionList, TouchableOpacity,
  ScrollView, StatusBar, Alert, ActionSheetIOS, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text, Icon, ActivityIndicator, FAB, Portal, Modal, Divider,
  Button, Card,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, expensesService, ApiGroup, ApiExpenseItem } from '../services/groupsService';
import { GroupBalancesData } from '../types';
import { groupColor } from '../constants/groupTypes';
import { getSymbol } from '../utils/currency';

function getExpenseRole(
  expense: ApiExpenseItem,
  myId: string,
): { role: 'lent' | 'borrowed' | 'none'; amount: number } {
  const { payerId, amount, splitMethod, splitDetails } = expense;
  const participants = Object.keys(splitDetails);

  const getShare = (uid: string): number => {
    if (participants.length === 0) return 0;
    if (splitMethod === 'equal') return amount / participants.length;
    if (splitMethod === 'percentage') return (amount * (splitDetails[uid] || 0)) / 100;
    return splitDetails[uid] || 0;
  };

  if (payerId === myId) {
    const myShare = getShare(myId);
    const othersTotal = amount - myShare;
    if (othersTotal > 0.01) return { role: 'lent', amount: othersTotal };
    return { role: 'none', amount: 0 };
  }

  if (participants.includes(myId)) {
    const myShare = getShare(myId);
    if (myShare > 0.01) return { role: 'borrowed', amount: myShare };
  }

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

function computeLocalBalances(expenses: ApiExpenseItem[], myId: string): GroupBalancesData {
  const memberMap: Record<string, { name: string; net: number }> = {};
  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  for (const e of expenses) {
    const participants = Object.keys(e.splitDetails);
    const getShare = (uid: string): number => {
      if (participants.length === 0) return 0;
      if (e.splitMethod === 'equal') return e.amount / participants.length;
      if (e.splitMethod === 'percentage') return (e.amount * (e.splitDetails[uid] || 0)) / 100;
      return e.splitDetails[uid] || 0;
    };

    for (const uid of participants) {
      if (!memberMap[uid]) memberMap[uid] = { name: e.participantNames?.[uid] ?? uid, net: 0 };
    }
    if (e.payerId && !memberMap[e.payerId]) {
      memberMap[e.payerId] = { name: e.participantNames?.[e.payerId] ?? e.payerId, net: 0 };
    }

    if (e.payerId === myId) {
      for (const uid of participants) {
        if (uid !== myId) {
          const share = getShare(uid);
          memberMap[uid].net -= share;
          memberMap[myId].net += share;
          totalOwedToYou += share;
        }
      }
    } else if (participants.includes(myId)) {
      const myShare = getShare(myId);
      memberMap[myId].net -= myShare;
      memberMap[e.payerId].net += myShare;
      totalYouOwe += myShare;
    }
  }

  const memberBalances = Object.entries(memberMap).map(([memberId, info]) => ({
    memberId,
    name: info.name,
    email: '',
    isMe: memberId === myId,
    net: info.net,
  }));

  return { totalOwedToYou, totalYouOwe, memberBalances };
}

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId, groupName: initialName } = route.params;
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const token = useStore(state => state.token);
  const myId = currentUser?.id ?? '';

  const [groupDetail, setGroupDetail] = useState<ApiGroup | null>(null);
  const [balances, setBalances] = useState<GroupBalancesData | null>(null);
  const [apiExpenses, setApiExpenses] = useState<ApiExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [balancesModalVisible, setBalancesModalVisible] = useState(false);
  const [balancesModalTab, setBalancesModalTab] = useState<'balances' | 'totals'>('balances');
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

    if (groupRes.status === 'fulfilled') setGroupDetail(groupRes.value.group);
    if (balancesRes.status === 'fulfilled') {
      setBalances(balancesRes.value);
    } else {
      const localExpenses = useStore.getState().expenses.filter(e => e.groupId === groupId);
      setBalances(computeLocalBalances(localExpenses as any, myId));
    }
    if (expensesRes.status === 'fulfilled') {
      setApiExpenses(expensesRes.value.expenses);
      setHasMore(expensesRes.value.hasMore ?? false);
    } else {
      const localExpenses = useStore.getState().expenses.filter(e => e.groupId === groupId);
      setApiExpenses(localExpenses.map(e => ({
        _id: e.id,
        groupId: e.groupId,
        payerId: e.payerId,
        amount: e.amount,
        currency: e.currency,
        notes: e.notes,
        date: e.date,
        splitMethod: e.splitMethod,
        splitDetails: e.splitDetails,
      })));
      setHasMore(false);
    }

    setLoading(false);
    setRefreshing(false);
  }, [currentUser, groupId, myId]);

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

  const expenseSections = useMemo(() => groupByMonth(apiExpenses), [apiExpenses]);

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
        <ActivityIndicator color={theme.primary} size="large" />
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
                  Alert.alert('Sync Warning', 'Expense deleted locally but could not sync to server.');
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
      <TouchableOpacity
        style={[styles.expenseRow, { borderBottomColor: theme.border }]}
        onPress={() => handleExpensePress(item)}
        activeOpacity={0.7}
      >
        {/* Date column */}
        <View style={styles.dateCol}>
          <Text style={styles.dateMonth}>{monthShort}</Text>
          <Text style={[styles.dateDay, { color: theme.text }]}>{day}</Text>
        </View>

        {/* Icon + title + subtitle */}
        <View style={[styles.expenseIconBox, { backgroundColor: headerColor + '22' }]}>
          <Icon source="receipt" size={20} color={headerColor} />
        </View>
        <View style={styles.expenseInfo}>
          <Text variant="bodyMedium" style={[styles.expenseTitle, { color: theme.text }]} numberOfLines={1}>
            {item.notes || 'Expense'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
            {payerName} paid {expSymbol}{item.amount.toFixed(2)}
          </Text>
        </View>

        {/* Role label + amount */}
        <View style={styles.expenseRight}>
          {role === 'lent' && (
            <>
              <Text style={[styles.roleLabel, { color: '#0F7A5B' }]}>you lent</Text>
              <Text style={[styles.roleAmount, { color: '#0F7A5B' }]}>
                {expSymbol}{roleAmount.toFixed(2)}
              </Text>
            </>
          )}
          {role === 'borrowed' && (
            <>
              <Text style={[styles.roleLabel, { color: '#E8673A' }]}>you borrowed</Text>
              <Text style={[styles.roleAmount, { color: '#E8673A' }]}>
                {expSymbol}{roleAmount.toFixed(2)}
              </Text>
            </>
          )}
          {role === 'none' && (
            <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>no balance</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>{section.title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed colored header */}
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon source="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => navigation.navigate('GroupSettings', { groupId, groupName: name })}
          >
            <Icon source="cog-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>

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
      </View>

      {/* Balance section */}
      <Card style={[styles.balanceSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Card.Content>
          <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>
            {Math.abs(myNet) < 0.005
              ? 'You are settled up in this group'
              : myNet > 0
              ? `You are owed ${symbol}${myNet.toFixed(2)} overall`
              : `You owe ${symbol}${Math.abs(myNet).toFixed(2)} overall`}
          </Text>
          {balances?.memberBalances
            .filter(m => !m.isMe && Math.abs(m.net) > 0.005)
            .map(m => (
              <View key={m.memberId} style={styles.memberBalanceRow}>
                <Text variant="bodySmall" style={{ color: theme.text }}>
                  {m.name} {m.net > 0 ? 'owes you' : 'you owe'}{' '}
                  <Text style={{ color: m.net > 0 ? '#0F7A5B' : '#E8673A', fontWeight: '600' }}>
                    {symbol}{Math.abs(m.net).toFixed(2)}
                  </Text>
                </Text>
                <Icon source="information-outline" size={14} color={theme.textSecondary} />
              </View>
            ))}
        </Card.Content>
      </Card>

      {/* Action bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.actionBar, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.actionBarContent}
      >
        <Button
          mode="contained"
          buttonColor="#E8673A"
          textColor="#FFF"
          onPress={() => navigation.navigate('SettleUpModal', {
            groupId,
            groupName: name,
            members: balances?.memberBalances ?? [],
          })}
          style={styles.actionPill}
          labelStyle={styles.actionPillText}
        >
          Settle up
        </Button>
        <Button
          mode="outlined"
          icon="chart-bar"
          onPress={() => navigation.navigate('Analytics')}
          style={[styles.actionBtn, { borderColor: theme.border }]}
          textColor={theme.text}
          labelStyle={styles.actionBtnText}
        >
          Charts
        </Button>
        <Button
          mode="outlined"
          icon="scale-balance"
          onPress={() => { setBalancesModalTab('balances'); setBalancesModalVisible(true); }}
          style={[styles.actionBtn, { borderColor: theme.border }]}
          textColor={theme.text}
          labelStyle={styles.actionBtnText}
        >
          Balances
        </Button>
        <Button
          mode="outlined"
          icon="sigma"
          onPress={() => { setBalancesModalTab('totals'); setBalancesModalVisible(true); }}
          style={[styles.actionBtn, { borderColor: theme.border }]}
          textColor={theme.text}
          labelStyle={styles.actionBtnText}
        >
          Totals
        </Button>
      </ScrollView>

      {/* Expense list grouped by month */}
      <SectionList
        sections={expenseSections}
        keyExtractor={item => item._id}
        renderItem={renderExpense}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="receipt-outline" size={56} color="#CCC" />
            <Text variant="bodyMedium" style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>
              No expenses yet.{'\n'}Tap + to add the first one.
            </Text>
          </View>
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
      />

      {/* Balances Modal */}
      <Portal>
        <Modal
          visible={balancesModalVisible}
          onDismiss={() => setBalancesModalVisible(false)}
          contentContainerStyle={[styles.balModal, { backgroundColor: theme.surface }]}
        >
          {/* Title */}
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            Group balances
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
            {name}
          </Text>

          {/* Tab toggle */}
          <View style={styles.balModalTabs}>
            {(['balances', 'totals'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.balModalTab,
                  { borderBottomColor: balancesModalTab === tab ? theme.primary : 'transparent' },
                ]}
                onPress={() => setBalancesModalTab(tab)}
              >
                <Text style={{
                  color: balancesModalTab === tab ? theme.primary : '#888',
                  fontWeight: balancesModalTab === tab ? '700' : '400',
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {balancesModalTab === 'balances' ? (
              <>
                {!balances || balances.memberBalances.filter(m => !m.isMe).length === 0 ? (
                  <Text style={{ color: '#888', textAlign: 'center', paddingVertical: 24 }}>
                    Everyone is settled up!
                  </Text>
                ) : balances.simplifiedTransactions && balances.simplifiedTransactions.length > 0 && groupDetail?.simplifyDebts ? (
                  <>
                    {balances.simplifiedTransactions.map((tx, i) => (
                      <React.Fragment key={`${tx.from}-${tx.to}-${i}`}>
                        {i > 0 && <Divider />}
                        <View style={styles.balMemberRow}>
                          <View style={[styles.balAvatar, { backgroundColor: theme.primary }]}>
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                              {(tx.fromName?.[0] ?? '?').toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.balMemberName, { color: theme.text }]} numberOfLines={1}>
                              {tx.fromName}
                            </Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                              owes {tx.toName}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#E8673A' }}>
                              {symbol}{tx.amount.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        {/* Action row */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginLeft: 46 }}>
                          <TouchableOpacity
                            style={[styles.balActionBtn, { borderColor: theme.border }]}
                            onPress={() => {
                              Alert.alert('Remind', `Send a payment reminder to ${tx.fromName}?`, [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Send',
                                  onPress: async () => {
                                    try {
                                      const { friendsService } = await import('../services/friendsService');
                                      await friendsService.remind(tx.from);
                                      Alert.alert('Sent', `Reminder sent to ${tx.fromName}`);
                                    } catch {
                                      Alert.alert('Error', 'Could not send reminder. Make sure you are friends with this user.');
                                    }
                                  },
                                },
                              ]);
                            }}
                          >
                            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Remind...</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.balSettleBtn, { backgroundColor: '#E8673A' }]}
                            onPress={() => {
                              setBalancesModalVisible(false);
                              navigation.navigate('SettleUpModal', {
                                groupId, groupName: name,
                                members: balances?.memberBalances ?? [],
                                preselectedMemberId: tx.from,
                              });
                            }}
                          >
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Settle up</Text>
                          </TouchableOpacity>
                        </View>
                      </React.Fragment>
                    ))}
                    {/* Simplify debts banner */}
                    <View style={[styles.simplifyBanner, { backgroundColor: theme.primary + '12' }]}>
                      <Icon source="lightbulb-on-outline" size={18} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '500', flex: 1, marginLeft: 8 }}>
                        Simplify debts is on, saving your group {balances.simplifiedTransactions.length} repayments
                      </Text>
                    </View>
                  </>
                ) : (
                  balances.memberBalances.filter(m => !m.isMe).map((m, i) => (
                    <React.Fragment key={m.memberId}>
                      {i > 0 && <Divider />}
                      <View style={styles.balMemberRow}>
                        <View style={[styles.balAvatar, { backgroundColor: theme.primary }]}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                            {(m.name?.[0] ?? '?').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.balMemberName, { color: theme.text }]}>{m.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: 11, color: m.net > 0.005 ? '#0F7A5B' : m.net < -0.005 ? '#E8673A' : '#888',
                          }}>
                            {m.net > 0.005 ? 'owes you' : m.net < -0.005 ? 'you owe' : 'settled'}
                          </Text>
                          {Math.abs(m.net) > 0.005 && (
                            <Text style={{
                              fontSize: 15, fontWeight: '700',
                              color: m.net > 0 ? '#0F7A5B' : '#E8673A',
                            }}>
                              {symbol}{Math.abs(m.net).toFixed(2)}
                            </Text>
                          )}
                        </View>
                        {m.net < -0.005 && (
                          <TouchableOpacity
                            style={[styles.balSettleBtn, { backgroundColor: '#E8673A' }]}
                            onPress={() => {
                              setBalancesModalVisible(false);
                              navigation.navigate('SettleUpModal', {
                                groupId, groupName: name,
                                members: balances?.memberBalances ?? [],
                                preselectedMemberId: m.memberId,
                              });
                            }}
                          >
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Settle</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </React.Fragment>
                  ))
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
                    <Text style={{ color: '#888', fontSize: 14 }}>{row.label}</Text>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.balModalClose, { backgroundColor: theme.primary }]}
            onPress={() => setBalancesModalVisible(false)}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>

      {/* FABs */}
      <View style={[styles.fabContainer, { bottom: Math.max(24, insets.bottom + 8) }]}>
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[styles.fabScan, { backgroundColor: theme.surface }]}
          color={theme.primary}
          onPress={() => navigation.navigate('QRScanner')}
        />
        <FAB
          icon="plus"
          label="Add expense"
          style={[styles.fabAdd, { backgroundColor: theme.primary }]}
          color="#FFF"
          onPress={() => navigation.navigate('AddExpenseModal', { groupId })}
        />
      </View>
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
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28, fontWeight: '700', color: '#FFF',
    paddingHorizontal: 20, marginBottom: 12,
  },
  headerMeta: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  metaChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' },

  // Balance section
  balanceSection: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  memberBalanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },

  // Action bar
  actionBar: {
    flexShrink: 0, maxHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  actionPill: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
  },
  actionPillText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnText: { fontSize: 13 },

  // Expense list
  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateCol: { width: 32, alignItems: 'center' },
  dateMonth: { fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  dateDay: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  expenseIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontWeight: '600' },
  expenseRight: { alignItems: 'flex-end', minWidth: 80 },
  roleLabel: { fontSize: 11, fontWeight: '500' },
  roleAmount: { fontSize: 14, fontWeight: '700' },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionHeaderText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  empty: { alignItems: 'center', paddingTop: 60 },
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: { elevation: 3 },
  fabAdd: { elevation: 3 },

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
    borderBottomColor: '#DDD', marginBottom: 16,
  },
  balModalTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2,
  },
  balMemberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 10,
  },
  balAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  balMemberName: { flex: 1, fontSize: 15, fontWeight: '500' },
  balSettleBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  balActionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1,
  },
  simplifyBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginTop: 8,
  },
  balModalClose: {
    marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  totalsRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
  },
});
