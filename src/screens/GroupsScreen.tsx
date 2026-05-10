import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text, Icon, ActivityIndicator, TouchableRipple, Surface, Portal, Modal, List, FAB, Banner, useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup, apiGroupToGroup, GroupMyBalance } from '../services/groupsService';
import { groupColor, getGroupTypeConfig } from '../constants/groupTypes';
import { getSymbol } from '../utils/currency';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import AppAvatar from '../components/AppAvatar';
import AppSearchBar from '../components/AppSearchBar';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';
import { computeBalances } from '../utils/balances';

function GroupIcon({ group, size = 48 }: { group: ApiGroup; size?: number }) {
  const config = getGroupTypeConfig(group.type);
  const color = groupColor(group._id, group.type);
  const paperTheme = useTheme();
  return (
    <View style={{
      width: size, height: size, borderRadius: 14,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
    }}>
      <Icon source={config.icon} size={size * 0.5} color={paperTheme.colors.onPrimary} />
    </View>
  );
}

/** Merge API myBalance with locally computed balances for a group */
function mergeGroupBalance(
  apiBalance: GroupMyBalance | undefined,
  localExpenses: Array<{ payerId: string; amount: number; splitMethod: string; splitDetails: Record<string, number> }>,
  myId: string,
  memberNames: Record<string, string>,
): GroupMyBalance {
  if (localExpenses.length === 0) {
    return apiBalance ?? { net: 0, totalOwedToYou: 0, totalYouOwe: 0, topDebts: [] };
  }

  const computed = computeBalances(
    localExpenses.map(e => ({ payerId: e.payerId, amount: e.amount, splitMethod: e.splitMethod, splitDetails: e.splitDetails })),
    myId,
    memberNames,
  );

  const localNet = computed.totalOwedToYou - computed.totalYouOwe;

  // If API has no balance data or API says settled up but local says otherwise, use local
  const useLocal = !apiBalance || (Math.abs(apiBalance.net) < 0.005 && Math.abs(localNet) > 0.005);

  if (!useLocal && apiBalance) {
    return apiBalance;
  }

  // Build topDebts from computed memberBalances
  const topDebts = computed.memberBalances
    .filter(m => Math.abs(m.net) > 0.005)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .map(m => ({ userId: m.memberId, name: m.name, net: m.net }));

  return {
    net: localNet,
    totalOwedToYou: computed.totalOwedToYou,
    totalYouOwe: computed.totalYouOwe,
    topDebts,
  };
}

export default function GroupsScreen({ navigation }: any) {
  const { theme, isDark } = useAppTheme();
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const setGroups = useStore(state => state.setGroups);
  const expenses = useStore(state => state.expenses);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');
  const myId = currentUser?.id ?? '';

  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'outstanding' | 'you_owe' | 'owed_to_you'>('none');

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(false);
    try {
      const data = await groupsService.getAll();
      setApiGroups(data.groups);
      setGroups(data.groups.map(apiGroupToGroup));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, setGroups]);

  useFocusEffect(useCallback(() => {
    fetchGroups();
  }, [fetchGroups]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableRipple onPress={() => navigation.navigate('CreateGroupModal')} style={{ marginRight: 16 }} borderless>
          <Text variant="labelLarge" style={{ color: theme.primary }}>Create group</Text>
        </TouchableRipple>
      ),
      headerLeft: () => (
        <TouchableRipple onPress={() => setSearchVisible(v => !v)} style={{ marginLeft: 16 }} borderless>
          <Icon source={searchVisible ? 'close' : 'magnify'} size={24} color={theme.primary} />
        </TouchableRipple>
      ),
    });
  }, [navigation, theme.primary, searchVisible]);

  // Build member name maps for each group
  const groupMemberNames = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    for (const g of apiGroups) {
      const map: Record<string, string> = {};
      g.members.forEach(m => { map[m._id] = m.name; });
      maps[g._id] = map;
    }
    return maps;
  }, [apiGroups]);

  // Compute merged balances for each group
  const groupsWithBalances = useMemo(() => {
    const localByGroup: Record<string, typeof expenses> = {};
    for (const e of expenses) {
      if (!e.groupId || e.groupId === 'direct') continue;
      if (!localByGroup[e.groupId]) localByGroup[e.groupId] = [];
      localByGroup[e.groupId].push(e);
    }

    return apiGroups.map(g => {
      const localExps = localByGroup[g._id] ?? [];
      const mergedBalance = mergeGroupBalance(
        g.myBalance,
        localExps.map(e => ({ payerId: e.payerId, amount: e.amount, splitMethod: e.splitMethod, splitDetails: e.splitDetails })),
        myId,
        groupMemberNames[g._id] ?? {},
      );
      return { ...g, myBalance: mergedBalance };
    });
  }, [apiGroups, expenses, myId, groupMemberNames]);

  const filteredGroups = (() => {
    let groups = query.trim()
      ? groupsWithBalances.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
      : groupsWithBalances;
    switch (activeFilter) {
      case 'outstanding':
        groups = groups.filter(g => Math.abs(g.myBalance?.net ?? 0) > 0.005);
        break;
      case 'you_owe':
        groups = groups.filter(g => (g.myBalance?.net ?? 0) < -0.005);
        break;
      case 'owed_to_you':
        groups = groups.filter(g => (g.myBalance?.net ?? 0) > 0.005);
        break;
    }
    return groups;
  })();

  // Split into active (non-zero balance) and settled
  const activeGroups = filteredGroups.filter(g => Math.abs(g.myBalance?.net ?? 0) > 0.005);
  const settledGroups = filteredGroups.filter(g => Math.abs(g.myBalance?.net ?? 0) <= 0.005);

  // Overall summary (includes direct expenses)
  const totalOwedToYou = groupsWithBalances.reduce((s, g) => s + (g.myBalance?.totalOwedToYou ?? 0), 0);
  const totalYouOwe = groupsWithBalances.reduce((s, g) => s + (g.myBalance?.totalYouOwe ?? 0), 0);

  // Non-group expenses
  const directExpenses = expenses.filter(e => e.groupId === 'direct');
  const directBalances = computeBalances(
    directExpenses.map(e => ({
      payerId: e.payerId,
      amount: e.amount,
      splitMethod: e.splitMethod,
      splitDetails: e.splitDetails,
    })),
    myId,
  );
  const directTotalOwedToYou = directBalances.totalOwedToYou;
  const directTotalYouOwe = directBalances.totalYouOwe;
  const directNet = directTotalOwedToYou - directTotalYouOwe;

  // Grand total including direct expenses
  const grandTotalOwedToYou = totalOwedToYou + directTotalOwedToYou;
  const grandTotalYouOwe = totalYouOwe + directTotalYouOwe;
  const grandNet = grandTotalOwedToYou - grandTotalYouOwe;

  const renderGroup = ({ item }: { item: ApiGroup & { myBalance?: GroupMyBalance } }) => {
    const balance = item.myBalance;
    const net = balance?.net ?? 0;
    const isOwed = net > 0.005;
    const isOwe = net < -0.005;
    const memberCount = item.members?.length ?? 0;

    return (
      <TouchableRipple
        onPress={() => {
          haptics.selection();
          navigation.navigate('GroupDetail', { groupId: item._id, groupName: item.name });
        }}
      >
        <Surface elevation={1} style={[styles.groupRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <GroupIcon group={item} />
          <View style={styles.groupInfo}>
            <Text variant="titleMedium" style={{ color: theme.text }} numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {balance?.topDebts && balance.topDebts.length > 0 ? ' · ' + balance.topDebts.length + ' balance' + (balance.topDebts.length > 1 ? 's' : '') : ''}
            </Text>
            {/* Per-person breakdowns */}
            {balance?.topDebts.slice(0, 1).map(d => (
              <Text key={d.userId} variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {d.net > 0 ? `${d.name} owes you` : `You owe ${d.name}`}{' '}
                <Text style={{ color: d.net > 0 ? theme.success : theme.warning, fontWeight: '600' }}>
                  {symbol}{Math.abs(d.net).toFixed(2)}
                </Text>
              </Text>
            ))}
          </View>
          <View style={styles.groupBalance}>
            {isOwed && (
              <>
                <Text variant="labelSmall" style={{ color: theme.success, textAlign: 'right' }}>you are owed</Text>
                <Text variant="titleSmall" style={{ color: theme.success, fontWeight: '700' }}>
                  {symbol}{net.toFixed(2)}
                </Text>
              </>
            )}
            {isOwe && (
              <>
                <Text variant="labelSmall" style={{ color: theme.warning, textAlign: 'right' }}>you owe</Text>
                <Text variant="titleSmall" style={{ color: theme.warning, fontWeight: '700' }}>
                  {symbol}{Math.abs(net).toFixed(2)}
                </Text>
              </>
            )}
            {!isOwed && !isOwe && (
              <Text variant="labelSmall" style={{ color: theme.textSecondary, textAlign: 'right' }}>settled up</Text>
            )}
          </View>
        </Surface>
      </TouchableRipple>
    );
  };

  if (loading && apiGroups.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const summaryCardBg = Math.abs(grandNet) < 0.005
    ? theme.border + '40'
    : grandNet > 0
    ? theme.success + '15'
    : theme.warning + '15';

  const summaryIcon = Math.abs(grandNet) < 0.005
    ? 'check-circle-outline'
    : grandNet > 0
    ? 'arrow-down-circle-outline'
    : 'arrow-up-circle-outline';

  const summaryColor = Math.abs(grandNet) < 0.005
    ? theme.textSecondary
    : grandNet > 0
    ? theme.success
    : theme.warning;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Error banner */}
      {fetchError && (
        <Banner
          visible
          actions={[{ label: 'Retry', onPress: () => fetchGroups() }]}
          icon="wifi-off"
        >
          Couldn't load groups — pull down to retry
        </Banner>
      )}

      {/* Search */}
      {searchVisible && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <AppSearchBar
            placeholder="Search groups…"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGroups(true)} />}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Summary card */}
        {groupsWithBalances.length > 0 && (
          <Surface elevation={2} style={[styles.summaryCard, { backgroundColor: summaryCardBg, borderColor: summaryColor + '40' }]}>
            <View style={styles.summaryCardRow}>
              <Icon source={summaryIcon} size={32} color={summaryColor} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>
                  {Math.abs(grandNet) < 0.005
                    ? 'You are all settled up'
                    : grandNet > 0
                    ? `${symbol}${grandNet.toFixed(2)}`
                    : `${symbol}${Math.abs(grandNet).toFixed(2)}`}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {Math.abs(grandNet) < 0.005
                    ? 'No outstanding balances'
                    : grandNet > 0
                    ? `You are owed ${symbol}${grandTotalOwedToYou.toFixed(2)} total`
                    : `You owe ${symbol}${grandTotalYouOwe.toFixed(2)} total`}
                </Text>
              </View>
              <TouchableRipple onPress={() => setFilterVisible(true)} borderless style={styles.filterBtn}>
                <Icon source="tune" size={22} color={theme.textSecondary} />
              </TouchableRipple>
            </View>
          </Surface>
        )}

        {filteredGroups.length === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title={query ? 'No groups match your search.' : 'No groups yet.'}
            subtitle={query ? undefined : 'Tap "Create group" to get started.'}
          />
        ) : (
          <>
            {/* Active groups */}
            {activeGroups.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {activeGroups.length} ACTIVE BALANCE{activeGroups.length > 1 ? 'S' : ''}
                </Text>
                {activeGroups.map(item => (
                  <React.Fragment key={item._id}>{renderGroup({ item })}</React.Fragment>
                ))}
              </View>
            )}

            {/* Settled groups section */}
            {settledGroups.length > 0 && (
              <View style={[styles.section, activeGroups.length > 0 && { marginTop: 8 }]}>
                {activeGroups.length > 0 && (
                  <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    SETTLED UP
                  </Text>
                )}
                {settledGroups.map(item => (
                  <React.Fragment key={item._id}>{renderGroup({ item })}</React.Fragment>
                ))}
              </View>
            )}

            {/* Non-group expenses */}
            {directExpenses.length > 0 && (
              <View style={[styles.section, { marginTop: 8 }]}>
                <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  NON-GROUP EXPENSES
                </Text>
                <TouchableRipple
                  onPress={() => {
                    haptics.selection();
                    navigation.navigate('ActivityTab', { screen: 'Activity' });
                  }}
                >
                  <Surface elevation={1} style={[styles.groupRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                    <View style={[styles.nonGroupIcon, { backgroundColor: theme.primary }]}>
                      <Icon source="cash-multiple" size={22} color={paperTheme.colors.onPrimary} />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text variant="titleMedium" style={{ color: theme.text }} numberOfLines={1}>
                        Non-group expenses
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {directExpenses.length} expense{directExpenses.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.groupBalance}>
                      {directNet > 0.005 && (
                        <>
                          <Text variant="labelSmall" style={{ color: theme.success, textAlign: 'right' }}>you are owed</Text>
                          <Text variant="titleSmall" style={{ color: theme.success, fontWeight: '700' }}>
                            {symbol}{directNet.toFixed(2)}
                          </Text>
                        </>
                      )}
                      {directNet < -0.005 && (
                        <>
                          <Text variant="labelSmall" style={{ color: theme.warning, textAlign: 'right' }}>you owe</Text>
                          <Text variant="titleSmall" style={{ color: theme.warning, fontWeight: '700' }}>
                            {symbol}{Math.abs(directNet).toFixed(2)}
                          </Text>
                        </>
                      )}
                      {Math.abs(directNet) <= 0.005 && (
                        <Text variant="labelSmall" style={{ color: theme.textSecondary, textAlign: 'right' }}>settled up</Text>
                      )}
                    </View>
                  </Surface>
                </TouchableRipple>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Filter modal */}
      <Portal>
        <Modal
          visible={filterVisible}
          onDismiss={() => setFilterVisible(false)}
          contentContainerStyle={[
            styles.modalSheet,
            { backgroundColor: paperTheme.colors.surface },
          ]}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Set filter
          </Text>
          {[
            { key: 'none' as const, label: 'None' },
            { key: 'outstanding' as const, label: 'Groups with outstanding balances' },
            { key: 'you_owe' as const, label: 'Group balances you owe' },
            { key: 'owed_to_you' as const, label: 'Group balances you are owed' },
          ].map(option => (
            <List.Item
              key={option.key}
              title={option.label}
              titleStyle={{
                color: activeFilter === option.key ? paperTheme.colors.primary : paperTheme.colors.onSurface,
              }}
              onPress={() => { setActiveFilter(option.key); setFilterVisible(false); }}
              right={props => activeFilter === option.key ? <List.Icon {...props} icon="check" color={paperTheme.colors.primary} /> : null}
            />
          ))}
          <TouchableRipple
            onPress={() => setFilterVisible(false)}
            style={[styles.modalCancel, { borderTopColor: theme.border }]}
          >
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.primary, textAlign: 'center' }}>
              Cancel
            </Text>
          </TouchableRipple>
        </Modal>
      </Portal>

      {/* FABs */}
      <View style={[styles.fabContainer, { bottom: Math.max(24, insets.bottom + 8) }]}>
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[styles.fabScan, { backgroundColor: theme.surface }]}
          color={theme.primary}
          onPress={() => {
            haptics.medium();
            navigation.navigate('QRScanner');
          }}
        />
        <FAB
          icon="plus"
          label="Add expense"
          style={[styles.fabAdd, { backgroundColor: theme.primary }]}
          color={paperTheme.colors.onPrimary}
          onPress={() => {
            haptics.medium();
            navigation.navigate('AddExpenseModal', {});
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  summaryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 12,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  groupInfo: { flex: 1 },
  groupBalance: { alignItems: 'flex-end', minWidth: 90 },
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: {},
  fabAdd: {},
  nonGroupIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  modalSheet: {
    marginTop: 'auto',
    marginHorizontal: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalTitle: { textAlign: 'center', marginBottom: 8, paddingHorizontal: 16 },
  modalCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
