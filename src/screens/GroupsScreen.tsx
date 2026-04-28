import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput as RNTextInput,
  ScrollView, RefreshControl, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon, ActivityIndicator, TouchableRipple, FAB, Banner } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup, apiGroupToGroup } from '../services/groupsService';
import { groupColor, getGroupTypeConfig } from '../constants/groupTypes';
import { getSymbol } from '../utils/currency';

function GroupIcon({ group, size = 48 }: { group: ApiGroup; size?: number }) {
  const config = getGroupTypeConfig(group.type);
  const color = groupColor(group._id, group.type);
  return (
    <View style={{
      width: size, height: size, borderRadius: 14,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
    }}>
      <Icon source={config.icon} size={size * 0.5} color="#FFF" />
    </View>
  );
}

export default function GroupsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const setGroups = useStore(state => state.setGroups);
  const expenses = useStore(state => state.expenses);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

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
        <TouchableOpacity onPress={() => navigation.navigate('CreateGroupModal')} style={{ marginRight: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 15 }}>Create group</Text>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => setSearchVisible(v => !v)} style={{ marginLeft: 16 }}>
          <Icon source={searchVisible ? 'close' : 'magnify'} size={24} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme.primary, searchVisible]);

  const filteredGroups = (() => {
    let groups = query.trim()
      ? apiGroups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
      : apiGroups;
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

  // Overall summary
  const totalOwedToYou = apiGroups.reduce((s, g) => s + (g.myBalance?.totalOwedToYou ?? 0), 0);
  const totalYouOwe = apiGroups.reduce((s, g) => s + (g.myBalance?.totalYouOwe ?? 0), 0);
  const overallNet = totalOwedToYou - totalYouOwe;

  // Non-group expenses
  const directExpenses = expenses.filter(e => e.groupId === 'direct');
  const directTotalOwedToYou = directExpenses.reduce((s, e) => {
    const myShare = Object.values(e.splitDetails).reduce((a, b) => a + b, 0) / Object.keys(e.splitDetails).length;
    return e.payerId === currentUser?.id ? s + (e.amount - myShare) : s;
  }, 0);
  const directTotalYouOwe = directExpenses.reduce((s, e) => {
    if (e.payerId === currentUser?.id) return s;
    return s + (e.splitDetails[currentUser?.id ?? ''] ?? 0);
  }, 0);
  const directNet = directTotalOwedToYou - directTotalYouOwe;

  const renderGroup = ({ item }: { item: ApiGroup }) => {
    const balance = item.myBalance;
    const net = balance?.net ?? 0;
    const isOwed = net > 0.005;
    const isOwe = net < -0.005;

    return (
      <TouchableRipple
        onPress={() => navigation.navigate('GroupDetail', { groupId: item._id, groupName: item.name })}
        rippleColor="rgba(0,0,0,0.06)"
      >
        <View style={[styles.groupRow, { borderBottomColor: theme.border }]}>
          <GroupIcon group={item} />
          <View style={styles.groupInfo}>
            <Text variant="bodyLarge" style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {/* Per-person breakdowns */}
            {balance?.topDebts.slice(0, 2).map(d => (
              <Text key={d.userId} variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {d.name} {d.net > 0 ? 'owes you' : 'you owe'}{' '}
                <Text style={{ color: d.net > 0 ? '#0F7A5B' : '#E8673A', fontWeight: '600' }}>
                  {symbol}{Math.abs(d.net).toFixed(2)}
                </Text>
              </Text>
            ))}
            {balance?.topDebts && balance.topDebts.length > 2 && (
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Plus {balance.topDebts.length - 2} more balance{balance.topDebts.length > 3 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={styles.groupBalance}>
            {isOwed && (
              <>
                <Text variant="labelSmall" style={{ color: '#0F7A5B', textAlign: 'right' }}>you are owed</Text>
                <Text variant="titleSmall" style={{ color: '#0F7A5B', fontWeight: '700' }}>
                  {symbol}{net.toFixed(2)}
                </Text>
              </>
            )}
            {isOwe && (
              <>
                <Text variant="labelSmall" style={{ color: '#E8673A', textAlign: 'right' }}>you owe</Text>
                <Text variant="titleSmall" style={{ color: '#E8673A', fontWeight: '700' }}>
                  {symbol}{Math.abs(net).toFixed(2)}
                </Text>
              </>
            )}
            {!isOwed && !isOwe && (
              <Text variant="labelSmall" style={{ color: theme.textSecondary, textAlign: 'right' }}>settled up</Text>
            )}
          </View>
        </View>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      {/* Inline search */}
      {searchVisible && (
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Icon source="magnify" size={20} color="#888" />
          <RNTextInput
            autoFocus
            placeholder="Search groups…"
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon source="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary bar */}
      {apiGroups.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
            {Math.abs(overallNet) < 0.005
              ? 'You are all settled up'
              : overallNet > 0
              ? `Overall, you are owed ${symbol}${overallNet.toFixed(2)}`
              : `Overall, you owe ${symbol}${Math.abs(overallNet).toFixed(2)}`}
          </Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Icon source="tune" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGroups(true)} />}
      >
        {filteredGroups.length === 0 ? (
          <View style={styles.empty}>
            <Icon source="account-group-outline" size={64} color="#CCC" />
            <Text variant="bodyLarge" style={{ color: '#999', textAlign: 'center', marginTop: 12 }}>
              {query ? 'No groups match your search.' : 'No groups yet.\nTap "Create group" to get started.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Active groups */}
            {activeGroups.map(item => (
              <React.Fragment key={item._id}>{renderGroup({ item })}</React.Fragment>
            ))}

            {/* Settled groups section */}
            {settledGroups.length > 0 && (
              <>
                {activeGroups.length > 0 && (
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, backgroundColor: theme.background }]}>
                    SETTLED UP
                  </Text>
                )}
                {settledGroups.map(item => (
                  <React.Fragment key={item._id}>{renderGroup({ item })}</React.Fragment>
                ))}
              </>
            )}

            {/* Non-group expenses */}
            {directExpenses.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, backgroundColor: theme.background }]}>
                  NON-GROUP EXPENSES
                </Text>
                <TouchableRipple
                  onPress={() => navigation.navigate('ActivityTab', { screen: 'Activity' })}
                  rippleColor="rgba(0,0,0,0.06)"
                >
                  <View style={[styles.groupRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.nonGroupIcon, { backgroundColor: theme.primary }]}>
                      <Icon source="cash-multiple" size={22} color="#FFF" />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text variant="bodyLarge" style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
                        Non-group expenses
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {directExpenses.length} expense{directExpenses.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.groupBalance}>
                      {directNet > 0.005 && (
                        <>
                          <Text variant="labelSmall" style={{ color: '#0F7A5B', textAlign: 'right' }}>you are owed</Text>
                          <Text variant="titleSmall" style={{ color: '#0F7A5B', fontWeight: '700' }}>
                            {symbol}{directNet.toFixed(2)}
                          </Text>
                        </>
                      )}
                      {directNet < -0.005 && (
                        <>
                          <Text variant="labelSmall" style={{ color: '#E8673A', textAlign: 'right' }}>you owe</Text>
                          <Text variant="titleSmall" style={{ color: '#E8673A', fontWeight: '700' }}>
                            {symbol}{Math.abs(directNet).toFixed(2)}
                          </Text>
                        </>
                      )}
                      {Math.abs(directNet) <= 0.005 && (
                        <Text variant="labelSmall" style={{ color: theme.textSecondary, textAlign: 'right' }}>settled up</Text>
                      )}
                    </View>
                  </View>
                </TouchableRipple>
              </>
            )}
          </>
        )}
        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      {/* Filter modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.background }]}>
            <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>
              Set filter
            </Text>
            {[
              { key: 'none' as const, label: 'None' },
              { key: 'outstanding' as const, label: 'Groups with outstanding balances' },
              { key: 'you_owe' as const, label: 'Group balances you owe' },
              { key: 'owed_to_you' as const, label: 'Group balances you are owed' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={styles.modalOption}
                onPress={() => { setActiveFilter(option.key); setFilterVisible(false); }}
              >
                <Text
                  variant="bodyLarge"
                  style={{
                    color: activeFilter === option.key ? theme.primary : theme.text,
                    fontWeight: activeFilter === option.key ? '600' : '400',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  {option.label}
                </Text>
                {activeFilter === option.key && (
                  <Icon source="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancel, { borderTopColor: theme.border }]}
              onPress={() => setFilterVisible(false)}
            >
              <Text variant="bodyLarge" style={{ color: theme.primary, fontWeight: '600', textAlign: 'center' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          onPress={() => navigation.navigate('AddExpenseModal', {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupInfo: { flex: 1 },
  groupName: { fontWeight: '600' },
  groupBalance: { alignItems: 'flex-end', minWidth: 90 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: { elevation: 3 },
  fabAdd: { elevation: 3 },
  nonGroupIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalTitle: { textAlign: 'center', fontWeight: '600', marginBottom: 8, paddingHorizontal: 16 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  modalCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
