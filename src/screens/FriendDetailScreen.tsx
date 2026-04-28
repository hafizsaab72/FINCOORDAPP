import React, { useMemo, useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Image, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon, FAB, Divider, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { BalanceBreakdown, friendsService } from '../services/friendsService';
import { groupColor, getGroupTypeConfig } from '../constants/groupTypes';
import { MemberBalance } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB',
  '#4FC3F7', '#4DB6AC', '#81C784', '#FFB74D', '#FF8A65',
];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
  CAD: 'CA$', AUD: 'A$', CHF: 'CHF', CNY: '¥', SGD: 'S$', AED: 'د.إ',
};
function currencySymbol(code?: string): string {
  return CURRENCY_SYMBOLS[code ?? ''] ?? '$';
}

// ─── Geometric banner ────────────────────────────────────────────────────────

const BANNER_H = 178;

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
    Alert.alert(
      'Send Reminder',
      `Send a payment reminder to ${friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await friendsService.remind(friendId);
              setRemindSnackMsg(`Reminder sent to ${friendName}`);
            } catch {
              setRemindSnackMsg('Could not send reminder. Try again.');
            }
            setRemindSnack(true);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >

        {/* ── Dark geometric banner ── */}
        <View>
          <GeometricBanner />

          {/* Back + gear over banner */}
          <View style={[styles.bannerBtns, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Icon source="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} onPress={handleGearPress}>
              <Icon source="cog-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Avatar overlapping banner bottom edge */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: theme.background }]}>
              {friendProfilePic ? (
                <Image source={{ uri: friendProfilePic }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor(friendId || friendName) }]}>
                  <Text style={styles.avatarLetter}>
                    {(friendName?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Name + balance ── */}
        <View style={styles.infoSection}>
          <Text style={[styles.friendName, { color: theme.text }]}>{friendName}</Text>

          {isOwed && (
            <Text style={[styles.balanceLine, { color: '#0F7A5B' }]}>
              You are owed {symbol}{absNet.toFixed(2)} overall
            </Text>
          )}
          {isOwe && (
            <Text style={[styles.balanceLine, { color: '#E8673A' }]}>
              You owe {symbol}{absNet.toFixed(2)} overall
            </Text>
          )}
          {!isOwed && !isOwe && (
            <Text style={[styles.balanceLine, { color: theme.textSecondary }]}>All settled up</Text>
          )}

          {/* Breakdown sub-lines */}
          {shownBreakdown.map((b, i) => {
            const owed = b.direction === 'owes_you';
            return (
              <Text key={i} style={[styles.breakdownLine, { color: '#888' }]} numberOfLines={1}>
                {owed ? 'Owes you ' : 'You owe '}
                <Text style={{ color: owed ? '#0F7A5B' : '#E8673A', fontWeight: '600' }}>
                  {symbol}{b.amount.toFixed(2)}
                </Text>
                {` in "${b.groupName}"`}
              </Text>
            );
          })}
          {extraCount > 0 && (
            <Text style={[styles.breakdownLine, { color: theme.textSecondary }]}>
              Plus {extraCount} more balance{extraCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* ── Action row ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E8673A' }]}
            onPress={() => {
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
            }}
          >
            <Icon source="handshake-outline" size={20} color="#FFF" />
            <Text style={styles.actionLabel}>Settle up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#242430' }]}
            onPress={handleRemind}
          >
            <Icon source="bell-outline" size={20} color="#FFF" />
            <Text style={styles.actionLabel}>Remind...</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#242430' }]}
            onPress={() => navigation.navigate('Analytics', { friendId, friendName })}
          >
            <Icon source="chart-bar" size={20} color="#9B59B6" />
            <Text style={styles.actionLabel}>Charts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#242430' }]}
            onPress={() => Alert.alert('Convert to IOU', 'Available with FinCoord Pro!')}
          >
            <Icon source="file-document-outline" size={20} color="#FFF" />
            <Text style={styles.actionLabel}>{'Convert\nto IOU'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Shared groups / activity ── */}
        {freshBreakdown.length > 0 ? (
          <>
            <View style={[styles.sectionBar, { borderBottomColor: theme.border }]}>
              <Text style={styles.sectionBarText}>SHARED GROUPS</Text>
            </View>

            {freshBreakdown.map((b, i) => {
              const color = groupColor(b.groupId);
              const typeConfig = getGroupTypeConfig(); // default icon
              const owed = b.direction === 'owes_you';

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.groupRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: b.groupId, groupName: b.groupName } })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.groupIconBox, { backgroundColor: color }]}>
                    <Icon source={typeConfig.icon} size={20} color="#FFF" />
                  </View>
                  <View style={styles.groupRowInfo}>
                    <Text style={[styles.groupRowName, { color: theme.text }]} numberOfLines={1}>
                      {b.groupName}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Shared group</Text>
                  </View>
                  <View style={styles.groupRowRight}>
                    {b.amount > 0.005 ? (
                      <>
                        <Text style={{ fontSize: 11, color: owed ? '#0F7A5B' : '#E8673A' }}>
                          {owed ? 'owes you' : 'you owe'}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: owed ? '#0F7A5B' : '#E8673A' }}>
                          {symbol}{b.amount.toFixed(2)}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 12, color: '#888' }}>settled</Text>
                    )}
                  </View>
                  <Icon source="chevron-right" size={18} color="#CCC" />
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View style={styles.emptySection}>
            <Icon source="handshake-outline" size={52} color="#CCC" />
            <Text style={{ color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
              No shared groups with {friendName} yet.
            </Text>
          </View>
        )}

        {/* ── Direct / non-group transactions ── */}
        {directExpenses.length > 0 && (
          <>
            <Divider style={{ marginTop: 8 }} />
            <View style={[styles.sectionBar, { borderBottomColor: theme.border }]}>
              <Text style={styles.sectionBarText}>DIRECT TRANSACTIONS</Text>
            </View>
            {directExpenses.map(e => {
              const iPaid = e.payerId === myId;
              const myNet = iPaid
                ? (e.splitDetails[friendId] ?? 0)   // friend owes me this
                : -(e.splitDetails[myId] ?? 0);      // I owe friend this
              const txColor = myNet > 0 ? '#0F7A5B' : '#E8673A';
              const d = new Date(e.date);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <View
                  key={e.id}
                  style={[styles.txRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={[styles.txIconBox, { backgroundColor: theme.border }]}>
                    <Icon source="swap-horizontal" size={18} color={theme.text} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txTitle, { color: theme.text }]} numberOfLines={1}>
                      {e.notes || 'Expense'}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      {iPaid ? 'You paid' : `${friendName} paid`} · {dateStr}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={{ fontSize: 11, color: txColor }}>
                      {myNet > 0 ? 'owes you' : 'you owe'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: txColor }}>
                      {symbol}{Math.abs(myNet).toFixed(2)}
                    </Text>
                  </View>
                </View>
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
          onPress={() => navigation.navigate('QRScanner')}
        />
        <FAB
          icon="plus"
          label="Add expense"
          style={[styles.fabAdd, { backgroundColor: theme.primary }]}
          color="#FFF"
          onPress={() => navigation.navigate('AddExpenseModal', { friendId, friendName })}
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
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: '#FFF', fontWeight: 'bold', fontSize: 36 },

  // Info
  infoSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 20 },
  friendName: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  balanceLine: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  breakdownLine: { fontSize: 13, marginTop: 3, lineHeight: 18 },

  // Action row
  actionRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 24,
  },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 14, gap: 5,
  },
  actionLabel: { color: '#FFF', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },

  // Section
  sectionBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionBarText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#888' },

  // Group rows
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupRowInfo: { flex: 1 },
  groupRowName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  groupRowRight: { alignItems: 'flex-end' },

  emptySection: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },

  // Direct transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  txRight: { alignItems: 'flex-end' },

  // FABs
  fabRow: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fabScan: { elevation: 3 },
  fabAdd: { elevation: 3 },
});
