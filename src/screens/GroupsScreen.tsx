import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, StatusBar,
  Pressable, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import {
  Text, Icon, ActivityIndicator, TouchableRipple, Surface, Portal, Modal, List, FAB, Banner, useTheme, TextInput, IconButton, Searchbar,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup } from '../services/groupsService';
import { groupColor, getGroupTypeConfig, getGroupIconConfig } from '../constants/groupTypes';
import { getSymbol } from '../utils/currency';
import AppAvatar from '../components/AppAvatar';
import AppSearchBar from '../components/AppSearchBar';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';
import { colors as staticColors, spacing, radius, shadows } from '../theme/tokens';

// ─── Glass hero card for summary ───────────────────────────────────────────
function SummaryHeroCard({
  totalOwedToYou, totalYouOwe, grandNet, symbol, onFilterPress, activeFilter,
}: {
  totalOwedToYou: number; totalYouOwe: number; grandNet: number;
  symbol: string; onFilterPress: () => void; activeFilter: string;
}) {
  const { theme } = useAppTheme();
  const { isOwed, isOwe, settled } = {
    isOwed: grandNet > 0.005,
    isOwe: grandNet < -0.005,
    settled: Math.abs(grandNet) <= 0.005,
  };

  const netColor = settled ? theme.textSecondary : isOwed ? theme.success : theme.warning;

  return (
    <View style={[styles.heroCard, { backgroundColor: theme.surface + 'E6', borderColor: theme.primary + '20' }]}>
      {/* Gradient sheen overlay */}
      <View style={styles.heroSheen} pointerEvents="none" />

      {/* Net balance line */}
      <View style={styles.heroTopRow}>
        <View>
          {settled ? (
            <>
              <Text variant="displaySmall" style={[styles.heroNetAmount, { color: theme.textSecondary }]}>
                Settled up
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2 }}>
                No outstanding balances
              </Text>
            </>
          ) : (
            <>
              <Text variant="displaySmall" style={[styles.heroNetAmount, { color: netColor }]}>
                {grandNet > 0 ? '+' : '-'}{symbol}{Math.abs(grandNet).toFixed(2)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {isOwed
                  ? `You are owed ${symbol}${totalOwedToYou.toFixed(2)}`
                  : `You owe ${symbol}${totalYouOwe.toFixed(2)}`}
              </Text>
            </>
          )}
        </View>
        <TouchableRipple onPress={onFilterPress} borderless style={styles.filterBtn}>
          <Icon source="tune" size={22} color={theme.textSecondary} />
        </TouchableRipple>
      </View>

      {/* Stat pills */}
      <View style={styles.statPillsRow}>
        <StatPill
          label="Owed to you"
          value={`${symbol}${totalOwedToYou.toFixed(2)}`}
          type="positive"
        />
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <StatPill
          label="You owe"
          value={`${symbol}${totalYouOwe.toFixed(2)}`}
          type="negative"
        />
      </View>
    </View>
  );
}

function StatPill({ label, value, type }: { label: string; value: string; type: 'positive' | 'negative' | 'neutral' }) {
  const { theme } = useAppTheme();
  const color = type === 'positive' ? theme.success : type === 'negative' ? theme.warning : theme.textSecondary;
  const borderColor = color + '40';

  return (
    <View style={[styles.statPill, { borderTopColor: color }]}>
      <Text variant="labelSmall" style={{ color: theme.textSecondary, letterSpacing: 0.04 }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Filter pills (horizontal scroll) ──────────────────────────────────────
function FilterPills({ active, onChange }: {
  active: string; onChange: (f: 'none' | 'outstanding' | 'you_owe' | 'owed_to_you') => void;
}) {
  const { theme } = useAppTheme();
  const pills = [
    { key: 'none', label: 'All' },
    { key: 'outstanding', label: 'Active' },
    { key: 'you_owe', label: 'You owe' },
    { key: 'owed_to_you', label: 'Owed to you' },
  ] as const;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterPillsContainer}
    >
      {pills.map(p => {
        const activeP = active === p.key;
        return (
          <Pressable
            key={p.key}
            onPress={() => onChange(p.key)}
            style={[
              styles.filterPill,
              activeP
                ? { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                : { backgroundColor: 'transparent', borderColor: theme.outlineVariant },
            ]}
          >
            <Text
              variant="labelMedium"
              style={{
                color: activeP ? theme.primary : theme.textSecondary,
                fontWeight: activeP ? '600' : '400',
              }}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Group card (glass + glow) ───────────────────────────────────────────────
function GroupCard({ item, symbol, onPress }: {
  item: ApiGroup; symbol: string; onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const balance = item.myBalance;
  const net = balance?.net ?? 0;
  const isOwed = net > 0.005;
  const isOwe = net < -0.005;
  const isSettled = !isOwed && !isOwe;
  const memberCount = item.members?.length ?? 0;
  const groupColorVal = groupColor(item._id, item.type);
  const iconConfig = item.icon ? getGroupIconConfig(item.icon) : null;
  const typeConfig = getGroupTypeConfig(item.type);

  const netColor = isSettled ? theme.textSecondary : isOwed ? theme.success : theme.warning;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={({ pressed }) => [
          styles.groupCard,
          {
            backgroundColor: theme.surface + 'E6',
            borderColor: theme.border + '10',
            opacity: pressed ? 0.85 : 1,
          },
          // Active balance → glow border
          isOwed && { borderColor: theme.success + '35', borderWidth: 1.5 },
          isOwe && { borderColor: theme.warning + '35', borderWidth: 1.5 },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: groupColorVal }]} />

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Icon + Info */}
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: groupColorVal + '1A' }]}>
              <Icon
                source={iconConfig?.icon ?? typeConfig.icon}
                size={20}
                color={groupColorVal}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text variant="titleMedium" style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                {balance?.topDebts && balance.topDebts.length > 0
                  ? ` · ${balance.topDebts.length} balance${balance.topDebts.length > 1 ? 's' : ''}`
                  : ''}
              </Text>
              {/* Top debt preview */}
              {balance?.topDebts.slice(0, 1).map(d => (
                <Text key={d.userId} variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {d.net > 0 ? `${d.name} owes you` : `You owe ${d.name}`}{' '}
                  <Text style={{ color: d.net > 0 ? theme.success : theme.warning, fontWeight: '600' }}>
                    {symbol}{Math.abs(d.net).toFixed(2)}
                  </Text>
                </Text>
              ))}
            </View>
          </View>

          {/* Balance pill */}
          <View style={[
            styles.balancePill,
            {
              backgroundColor: netColor + '15',
              borderColor: netColor + '30',
            },
          ]}>
            {isSettled ? (
              <Text variant="labelSmall" style={{ color: theme.textSecondary }}>settled</Text>
            ) : (
              <>
                <Text variant="labelSmall" style={{ color: netColor, opacity: 0.8 }}>
                  {isOwed ? 'owed to you' : 'you owe'}
                </Text>
                <Text variant="titleSmall" style={{ color: netColor, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {symbol}{Math.abs(net).toFixed(2)}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.cardChevron}>
          <Icon source="chevron-right" size={20} color={theme.textTertiary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function GroupsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme, isDark } = useAppTheme();
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
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
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useFocusEffect(useCallback(() => {
    fetchGroups();
  }, [fetchGroups]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        query.length > 0 ? (
          <Searchbar
            placeholder="Search groups…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={{
              flex: 1,
              maxWidth: 300,
              height: 40,
              backgroundColor: theme.surface + 'CC',
            }}
            inputStyle={{ color: theme.text }}
            iconColor={theme.textSecondary}
            placeholderTextColor={theme.textSecondary}
          />
        ) : (
          <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>Groups</Text>
        )
      ),
      headerRight: () => (
        query.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconButton icon="magnify" size={24} iconColor={theme.text} onPress={() => setQuery(' ')} style={{ padding: 10 }} />
            <IconButton icon="account-plus-outline" size={24} iconColor={theme.primary} onPress={() => navigation.navigate('CreateGroupModal')} style={{ padding: 10 }} />
          </View>
        )
      ),
    });
  }, [navigation, theme, query]);

  const filteredGroups = useMemo(() => {
    let groups = query.trim()
      ? apiGroups.filter(g => g.name.toLowerCase().includes(query.toLowerCase().trim()))
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
  }, [query, activeFilter, apiGroups]);

  const activeGroups = useMemo(() =>
    filteredGroups.filter(g => Math.abs(g.myBalance?.net ?? 0) > 0.005)
  , [filteredGroups]);

  const settledGroups = useMemo(() =>
    filteredGroups.filter(g => Math.abs(g.myBalance?.net ?? 0) <= 0.005)
  , [filteredGroups]);

  const totalOwedToYou = apiGroups.reduce((s, g) => s + (g.myBalance?.totalOwedToYou ?? 0), 0);
  const totalYouOwe = apiGroups.reduce((s, g) => s + (g.myBalance?.totalYouOwe ?? 0), 0);
  const grandNet = totalOwedToYou - totalYouOwe;

  if (loading && apiGroups.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {fetchError && (
        <Banner
          visible
          actions={[{ label: 'Retry', onPress: () => fetchGroups() }]}
          icon="wifi-off"
        >
          Couldn't load groups — pull down to retry
        </Banner>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGroups(true)} />}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* Hero summary card */}
        {apiGroups.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 16 }}>
            <SummaryHeroCard
              totalOwedToYou={totalOwedToYou}
              totalYouOwe={totalYouOwe}
              grandNet={grandNet}
              symbol={symbol}
              onFilterPress={() => setFilterVisible(true)}
              activeFilter={activeFilter}
            />
          </View>
        )}

        {/* Filter pills */}
        {apiGroups.length > 0 && (
          <FilterPills active={activeFilter} onChange={setActiveFilter} />
        )}

        {filteredGroups.length === 0 ? (
          <View style={{ paddingTop: 40 }}>
            <EmptyState
              icon="account-group-outline"
              title={query ? 'No groups match your search.' : 'No groups yet.'}
              subtitle={query ? undefined : 'Tap "Create group" to get started.'}
            />
          </View>
        ) : (
          <>
            {activeGroups.length > 0 && (
              <View style={styles.section}>
                {!query && activeFilter === 'none' && (
                  <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    {activeGroups.length} ACTIVE BALANCE{activeGroups.length > 1 ? 'S' : ''}
                  </Text>
                )}
                {activeGroups.map(item => (
                  <GroupCard
                    key={item._id}
                    item={item}
                    symbol={symbol}
                    onPress={() => navigation.navigate('GroupDetail', {
                      groupId: item._id, groupName: item.name,
                      groupIcon: item.icon, groupImage: item.image,
                    })}
                  />
                ))}
              </View>
            )}

            {settledGroups.length > 0 && (
              <View style={[styles.section, activeGroups.length > 0 && { marginTop: 8 }]}>
                {activeGroups.length > 0 && !query && (
                  <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    SETTLED UP
                  </Text>
                )}
                {settledGroups.map(item => (
                  <GroupCard
                    key={item._id}
                    item={item}
                    symbol={symbol}
                    onPress={() => navigation.navigate('GroupDetail', {
                      groupId: item._id, groupName: item.name,
                      groupIcon: item.icon, groupImage: item.image,
                    })}
                  />
                ))}
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
            Filter groups
          </Text>
          {([
            { key: 'none' as const, label: 'All groups' },
            { key: 'outstanding' as const, label: 'Groups with balances' },
            { key: 'you_owe' as const, label: 'Balances you owe' },
            { key: 'owed_to_you' as const, label: 'Balances you are owed' },
          ] as const).map(option => (
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
      <View style={[styles.fabContainer, { bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET, gap: 12 }]}>
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[
            styles.fabScan,
            {
              backgroundColor: theme.surface + 'CC',
              borderWidth: 1,
              borderColor: theme.outlineVariant + '60',
            },
          ]}
          color={theme.textSecondary}
          onPress={() => {
            haptics.medium();
            navigation.navigate('QRScanner');
          }}
        />
        <FAB
          icon="plus"
          style={[
            styles.fabAdd,
            {
              backgroundColor: theme.primary,
              borderRadius: 16,
              ...Platform.select({
                ios: {
                  shadowColor: theme.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                },
                android: {},
              }),
            },
          ]}
          color="#FFFFFF"
          onPress={() => {
            haptics.medium();
            navigation.navigate('AddExpense', {});
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerTitle: {},
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { padding: 10 },
  inlineSearch: { flex: 1, height: 48, borderRadius: 12 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    // Uses inline style: backgroundColor=theme.surface+'E6', borderColor=theme.primary+'20'
    overflow: 'hidden',
  },
  heroSheen: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroNetAmount: {
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  filterBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  statPillsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 0,
  },
  statPill: {
    flex: 1,
    borderTopWidth: 2,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 12,
    alignSelf: 'stretch',
    marginTop: 2,
  },

  // ── Filter pills ────────────────────────────────────────────────────────────
  filterPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  // ── Group card ──────────────────────────────────────────────────────────────
  cardWrapper: {
    marginBottom: 0,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    // backgroundColor + borderColor use inline style with theme.surface/theme.border
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
  },
  iconBox: {
    width: 40, height: 40,
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardChevron: {
    marginLeft: 4,
    flexShrink: 0,
  },
  balancePill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 80,
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 4,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontWeight: '600',
    letterSpacing: 0.08,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  // ── FABs ───────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: {},
  fabAdd: {},

  // ── Modal ──────────────────────────────────────────────────────────────────
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