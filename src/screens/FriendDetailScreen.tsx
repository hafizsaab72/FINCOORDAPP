import React, { useMemo, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon, FAB, Divider, Snackbar, TouchableRipple, Surface } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { BalanceBreakdown, friendsService } from '../services/friendsService';
import { groupColor, getGroupTypeConfig } from '../constants/groupTypes';
import { MemberBalance } from '../types';
import ActionBar from '../components/ActionBar';
import AppAvatar from '../components/AppAvatar';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
  CAD: 'CA$', AUD: 'A$', CHF: 'CHF', CNY: '¥', SGD: 'S$', AED: 'د.إ',
};
function currencySymbol(code?: string): string {
  return CURRENCY_SYMBOLS[code ?? ''] ?? '$';
}

// ─── Geometric banner ────────────────────────────────────────────────────────

const BANNER_H = 150;

function GeometricBanner() {
  return (
    <View style={{ height: BANNER_H, backgroundColor: '#13151A', overflow: 'hidden' }}>
      <View style={[geo.base, { width: 270, height: 270, borderRadius: 135, top: -115, right: -85 }]} />
      <View style={[geo.base, { width: 160, height: 160, borderRadius: 80, top: 25, left: -70, opacity: 0.04 }]} />
      <View style={[geo.base, { width: 72, height: 72, borderRadius: 6, top: 55, right: 95, opacity: 0.07, transform: [{ rotate: '30deg' }] }]} />
      <View style={[geo.base, { width: 36, height: 36, borderRadius: 3, top: 22, left: 115, opacity: 0.06, transform: [{ rotate: '45deg' }] }]} />
      <View style={[geo.base, { width: 46, height: 46, borderRadius: 23, bottom: 28, right: 62, opacity: 0.05 }]} />
      <View style={[geo.base, { width: 22, height: 22, borderRadius: 2, bottom: 52, left: 82, opacity: 0.08, transform: [{ rotate: '20deg' }] }]} />
      <View style={[geo.base, { width: 14, height: 14, borderRadius: 7, bottom: 20, right: 160, opacity: 0.06 }]} />
    </View>
  );
}
const geo = StyleSheet.create({ base: { position: 'absolute', backgroundColor: '#FFF', opacity: 0.06 } });

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function FriendDetailScreen({ route, navigation }: any) {
  const {
    friendId = '',
    friendName = 'Friend',
    friendProfilePic,
    breakdown = [] as BalanceBreakdown[],
  } = route.params ?? {};

  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const localExpenses = useStore(state => state.expenses);
  const token = useStore(state => state.token);
  const myId = currentUser?.id ?? '';
  const myName = currentUser?.name ?? 'You';
  const symbol = currencySymbol(currentUser?.currency);

  const [remindSnack, setRemindSnack] = useState(false);
  const [remindSnackMsg, setRemindSnackMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Live breakdown — initialized from route params, refreshed on focus
  const [freshBreakdown, setFreshBreakdown] = useState<BalanceBreakdown[]>(breakdown as BalanceBreakdown[]);

  const loadBreakdown = useCallback(() => {
    if (!token) return;
    friendsService.getBalances().then(res => {
      const friend = res?.friends?.find((f: any) => f.friendId === friendId);
      if (friend) setFreshBreakdown(friend.breakdown ?? []);
    }).catch(() => {});
  }, [friendId, token]);

  useFocusEffect(useCallback(() => {
    loadBreakdown();
  }, [loadBreakdown]));

  const onRefresh = () => {
    setRefreshing(true);
    loadBreakdown();
    setTimeout(() => setRefreshing(false), 800);
  };

  // Recompute the group-level balance from fresh breakdown
  const groupNetBalance = useMemo(() =>
    freshBreakdown.reduce((sum, b) =>
      sum + (b.direction === 'owes_you' ? b.amount : -b.amount), 0),
    [freshBreakdown],
  );

  // Compute local direct balance reactively from store
  const localDirectBalance = useMemo(() => {
    let bal = 0;
    for (const e of localExpenses.filter(ex => ex.groupId === 'direct')) {
      if (e.payerId === myId) {
        bal += e.splitDetails[friendId] ?? 0;
      } else if (e.payerId === friendId) {
        bal -= e.splitDetails[myId] ?? 0;
      }
    }
    return bal; // positive = friend owes me, negative = I owe friend
  }, [localExpenses, friendId, myId]);

  // Combined balance: group-level from API + direct from local store
  const effectiveNetBalance = groupNetBalance + localDirectBalance;

  const isOwed = effectiveNetBalance > 0.005;
  const isOwe  = effectiveNetBalance < -0.005;
  const absNet = Math.abs(effectiveNetBalance);

  const shownBreakdown = freshBreakdown.slice(0, 3);
  const extraCount = Math.max(0, freshBreakdown.length - 3);

  // Direct expenses (local store) involving this friend
  const directExpenses = useMemo(() =>
    localExpenses
      .filter(e =>
        e.groupId === 'direct' &&
        ((e.payerId === myId && (e.splitDetails[friendId] ?? 0) > 0) ||
         (e.payerId === friendId && (e.splitDetails[myId] ?? 0) > 0)),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [localExpenses, friendId, myId],
  );

  const handleGearPress = () => {
    haptics.light();
    Alert.alert(
      friendName,
      'Manage this friend',
      [
        {
          text: 'Remove Friend',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove Friend',
              `Remove ${friendName} from your friends list?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await friendsService.remove(friendId);
                      haptics.success();
                    } catch {
                      // Silent fail — navigate back regardless
                    }
                    navigation.goBack();
                  },
                },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleRemind = () => {
    haptics.light();
    (async () => {
      try {
        await friendsService.remind(friendId);
        haptics.success();
        setRemindSnackMsg(`Reminder sent to ${friendName}`);
      } catch {
        setRemindSnackMsg('Could not send reminder. Try again.');
      }
      setRemindSnack(true);
    })();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ═══════════════════════════════════════════════════════════════
          FIXED HEADER — banner, avatar, name, balance, actions
          (does NOT scroll)
         ═══════════════════════════════════════════════════════════════ */}
      <View>
        {/* Banner with safe-area padding */}
        <View style={{ paddingTop: insets.top }}>
          <GeometricBanner />
        </View>

        {/* Buttons overlaid on banner */}
        <View style={[styles.bannerBtns, { top: insets.top + 8 }]}>
          <TouchableRipple
            style={styles.circleBtn}
            onPress={() => {
              // @ts-ignore popTo available in native-stack v6.7+/v7
              if (navigation.popTo) {
                navigation.popTo('Friends');
              } else {
                navigation.goBack();
              }
            }}
            borderless
          >
            <Icon source="arrow-left" size={22} color="#FFF" />
          </TouchableRipple>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableRipple
              style={styles.circleBtn}
              onPress={() => {
                haptics.light();
                navigation.navigate('Search');
              }}
              borderless
            >
              <Icon source="magnify" size={22} color="#FFF" />
            </TouchableRipple>
            <TouchableRipple
              style={styles.circleBtn}
              onPress={handleGearPress}
              borderless
            >
              <Icon source="cog-outline" size={22} color="#FFF" />
            </TouchableRipple>
          </View>
        </View>

        {/* Avatar overlapping banner bottom */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: theme.background }]}>
            <AppAvatar
              user={{ _id: friendId, name: friendName, profilePic: friendProfilePic }}
              size={90}
            />
          </View>
        </View>

        {/* Name + balance */}
        <View style={styles.infoSection}>
          <Text variant="headlineSmall" style={{ color: theme.text }}>{friendName}</Text>

          {isOwed && (
            <Text variant="titleMedium" style={{ color: theme.success }}>
              You are owed {symbol}{absNet.toFixed(2)} overall
            </Text>
          )}
          {isOwe && (
            <Text variant="titleMedium" style={{ color: theme.warning }}>
              You owe {symbol}{absNet.toFixed(2)} overall
            </Text>
          )}
          {!isOwed && !isOwe && (
            <Text variant="titleMedium" style={{ color: theme.textSecondary }}>All settled up</Text>
          )}

          {/* Breakdown sub-lines */}
          {shownBreakdown.map((b, i) => {
            const owed = b.direction === 'owes_you';
            return (
              <Text key={i} variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 3, lineHeight: 18 }} numberOfLines={1}>
                {owed ? 'Owes you ' : 'You owe '}
                <Text style={{ color: owed ? theme.success : theme.warning, fontWeight: '600' }}>
                  {symbol}{b.amount.toFixed(2)}
                </Text>
                {` in "${b.groupName}"`}
              </Text>
            );
          })}
          {extraCount > 0 && (
            <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 3, lineHeight: 18 }}>
              Plus {extraCount} more balance{extraCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Horizontal scrollable action bar */}
        <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
          <ActionBar
            actions={[
              {
                icon: 'handshake-outline',
                label: 'Settle up',
                onPress: () => {
                  haptics.light();
                  const settleMembers: MemberBalance[] = [
                    { memberId: myId, name: myName, email: currentUser?.email ?? '', isMe: true, net: -effectiveNetBalance },
                    { memberId: friendId, name: friendName, email: '', isMe: false, net: effectiveNetBalance },
                  ];
                  navigation.navigate('SettleUpModal', {
                    groupId: 'direct',
                    groupName: `Settlement with ${friendName}`,
                    members: settleMembers,
                    preselectedMemberId: effectiveNetBalance > 0 ? friendId : myId,
                  });
                },
                variant: 'contained',
              },
              {
                icon: 'bell-outline',
                label: 'Remind',
                onPress: handleRemind,
              },
              {
                icon: 'chart-bar',
                label: 'Charts',
                onPress: () => {
                  haptics.light();
                  navigation.navigate('Analytics', { friendId, friendName });
                },
              },
              {
                icon: 'file-document-outline',
                label: 'To IOU',
                onPress: () => {
                  haptics.light();
                  setRemindSnackMsg('Available with FinCoord Pro!');
                  setRemindSnack(true);
                },
              },
            ]}
          />
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — shared groups + direct transactions
         ═══════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Shared groups */}
        {freshBreakdown.length > 0 ? (
          <>
            <View style={[styles.sectionBar, { borderBottomColor: theme.border }]}>
              <Text variant="titleMedium" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Shared groups</Text>
            </View>

            {freshBreakdown.map((b, i) => {
              const color = groupColor(b.groupId);
              const typeConfig = getGroupTypeConfig();
              const owed = b.direction === 'owes_you';

              return (
                <TouchableRipple
                  key={i}
                  onPress={() => {
                    haptics.light();
                    navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: b.groupId, groupName: b.groupName } });
                  }}
                >
                  <Surface style={[styles.groupRow, { borderBottomColor: theme.border }]} elevation={1}>
                    <View style={[styles.groupIconBox, { backgroundColor: color }]}>
                      <Icon source={typeConfig.icon} size={20} color="#FFF" />
                    </View>
                    <View style={styles.groupRowInfo}>
                      <Text variant="titleSmall" style={{ color: theme.text }} numberOfLines={1}>
                        {b.groupName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Shared group</Text>
                    </View>
                    <View style={styles.groupRowRight}>
                      {b.amount > 0.005 ? (
                        <>
                          <Text variant="bodySmall" style={{ color: owed ? theme.success : theme.warning }}>
                            {owed ? 'owes you' : 'you owe'}
                          </Text>
                          <Text variant="titleSmall" style={{ color: owed ? theme.success : theme.warning }}>
                            {symbol}{b.amount.toFixed(2)}
                          </Text>
                        </>
                      ) : (
                        <Text variant="bodySmall" style={{ color: theme.textSecondary }}>settled</Text>
                      )}
                    </View>
                    <Icon source="chevron-right" size={18} color={theme.outline} />
                  </Surface>
                </TouchableRipple>
              );
            })}
          </>
        ) : (
          <EmptyState
            icon="handshake-outline"
            title="No shared groups"
            subtitle={`No shared groups with ${friendName} yet.`}
          />
        )}

        {/* Direct transactions */}
        {directExpenses.length > 0 && (
          <>
            <Divider style={{ marginTop: 8 }} />
            <View style={[styles.sectionBar, { borderBottomColor: theme.border }]}>
              <Text variant="titleMedium" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Direct transactions</Text>
            </View>
            {directExpenses.map(e => {
              const iPaid = e.payerId === myId;
              const myNet = iPaid
                ? (e.splitDetails[friendId] ?? 0)
                : -(e.splitDetails[myId] ?? 0);
              const txColor = myNet > 0 ? theme.success : theme.warning;
              const d = new Date(e.date);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <Surface
                  key={e.id}
                  style={[styles.txRow, { borderBottomColor: theme.border }]}
                  elevation={1}
                >
                  <View style={[styles.txIconBox, { backgroundColor: theme.border }]}>
                    <Icon source="swap-horizontal" size={18} color={theme.text} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text variant="titleSmall" style={{ color: theme.text }} numberOfLines={1}>
                      {e.notes || 'Expense'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                      {iPaid ? 'You paid' : `${friendName} paid`} · {dateStr}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text variant="bodySmall" style={{ color: txColor }}>
                      {myNet > 0 ? 'owes you' : 'you owe'}
                    </Text>
                    <Text variant="titleSmall" style={{ color: txColor }}>
                      {symbol}{Math.abs(myNet).toFixed(2)}
                    </Text>
                  </View>
                </Surface>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── FABs ── */}
      <View style={[styles.fabRow, { bottom: Math.max(24, insets.bottom + 8) }]}>
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[styles.fabScan, { backgroundColor: theme.surface }]}
          color={theme.primary}
          onPress={() => {
            haptics.light();
            navigation.navigate('QRScanner');
          }}
        />
        <FAB
          icon="plus"
          label="Add expense"
          style={[styles.fabAdd, { backgroundColor: theme.primary }]}
          color="#FFF"
          onPress={() => {
            haptics.light();
            navigation.navigate('AddExpenseModal', { friendId, friendName });
          }}
        />
      </View>

      <Snackbar
        visible={remindSnack}
        onDismiss={() => setRemindSnack(false)}
        duration={3000}
        style={{ bottom: 90 }}
      >
        {remindSnackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Banner
  bannerBtns: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.30)', justifyContent: 'center', alignItems: 'center',
  },

  // Avatar
  avatarWrap: { alignItems: 'center', marginTop: -47 },
  avatarRing: { borderWidth: 4, borderRadius: 50, overflow: 'hidden' },

  // Info
  infoSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 16 },

  // Section
  sectionBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Group rows
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupRowInfo: { flex: 1 },
  groupRowRight: { alignItems: 'flex-end' },

  // Direct transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txRight: { alignItems: 'flex-end' },

  // FABs
  fabRow: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: { elevation: 3 },
  fabAdd: { elevation: 3 },
});
