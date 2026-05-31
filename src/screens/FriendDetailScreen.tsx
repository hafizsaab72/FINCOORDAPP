import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import { Text, Icon, FAB, Snackbar, TouchableRipple, Surface, IconButton, Modal, Portal, Button, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { BalanceBreakdown, friendsService } from '../services/friendsService';
import { expensesService } from '../services/expensesService';
import { groupColor, getGroupTypeConfig } from '../constants/groupTypes';
import { MemberBalance, Participant, Split, Payer, Expense } from '../types';
import { apiExpenseToLocal } from '../utils/balances';
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

// ─── Compact Purple Header ───────────────────────────────────────────

const HEADER_H = 120;

function CompactHeader({ insets, colors }: { insets: any; colors: any }) {
  return (
    <View style={{ height: HEADER_H, backgroundColor: colors.primary }}>
      {/* Subtle gradient orbs */}
      <View style={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(139, 92, 246, 0.25)',
      }} />
      <View style={{
        position: 'absolute', bottom: -20, left: -20,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
      }} />
      {/* Bottom gradient fade */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
        backgroundColor: colors.bgBase,
      }} />
    </View>
  );
}

// ─── Balance Card ─────────────────────────────────────────────────────

function BalanceCard({ isOwed, isOwe, absNet, symbol, colors }: {
  isOwed: boolean; isOwe: boolean; absNet: number; symbol: string; colors: any;
}) {
  const balanceColor = isOwed ? colors.credit : isOwe ? colors.debt : colors.textSecondary;
  const balanceLabel = isOwed ? 'owes you' : isOwe ? 'you owe' : 'settled';

  return (
    <View style={[styles.balanceCard, {
      backgroundColor: isOwed ? `${colors.credit}12` : isOwe ? `${colors.debt}12` : colors.surfaceSecondary,
      borderColor: balanceColor,
    }]}>
      <Text variant="labelSmall" style={{ color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {balanceLabel}
      </Text>
      <Text style={{
        fontSize: 28, fontWeight: '700', color: balanceColor,
        fontFamily: 'System',
        marginTop: 2,
      }}>
        {symbol}{absNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

// ─── Group Row ─────────────────────────────────────────────────────────

function GroupRow({ b, navigation, colors, symbol }: {
  b: BalanceBreakdown; navigation: any; colors: any; symbol: string;
}) {
  const color = groupColor(b.groupId);
  const typeConfig = getGroupTypeConfig();
  const owed = b.direction === 'owes_you';

  return (
    <TouchableRipple
      onPress={() => {
        haptics.light();
        navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: b.groupId, groupName: b.groupName } });
      }}
      style={[styles.groupRow, { backgroundColor: colors.surfacePrimary }]}
    >
      <View style={styles.groupRowContent}>
        <View style={[styles.groupIcon, { backgroundColor: `${color}18` }]}>
          <Icon source={typeConfig.icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '500' }} numberOfLines={1}>
            {b.groupName}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textTertiary, marginTop: 1 }}>
            {owed ? 'Owes you' : 'You owe'}
          </Text>
        </View>
        <Text style={{
          fontSize: 16, fontWeight: '600',
          color: owed ? colors.credit : colors.debt,
        }}>
          {symbol}{b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableRipple>
  );
}

// ─── Transaction Row ───────────────────────────────────────────────────

function TransactionRow({ tx, myId, friendId, colors, symbol, navigation }: {
  tx: Expense; myId: string; friendId: string; colors: any; symbol: string; navigation: any;
}) {
  const payer = tx.payers.find((p: Payer) => p.amountPaid > 0);
  const isMyPayer = tx.payers.some((p: Payer) => p.userId === myId && p.amountPaid > 0);
  const friendPayer = tx.payers.find((p: Payer) => p.userId === friendId);
  const mySplit = tx.splits.find((s: Split) => s.userId === myId)?.computedAmount ?? 0;
  const friendSplit = tx.splits.find((s: Split) => s.userId === friendId)?.computedAmount ?? 0;

  const net = isMyPayer
    ? (payer!.amountPaid - mySplit - friendSplit)
    : friendPayer
      ? (mySplit - friendPayer.amountPaid + friendSplit)
      : 0;
  const isOwed = net > 0.005;
  const netAbs = Math.abs(net);

  const dateStr = tx.date
    ? new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <TouchableRipple
      onPress={() => {
        haptics.light();
        navigation.navigate('AddExpense', { expenseId: tx.id, groupId: tx.groupId });
      }}
      style={[styles.txRow, { backgroundColor: colors.surfacePrimary }]}
    >
      <View style={styles.txRowContent}>
        <View style={[styles.txIcon, {
          backgroundColor: isOwed ? `${colors.credit}18` : `${colors.debt}18`,
        }]}>
          <Icon source="cash" size={18} color={isOwed ? colors.credit : colors.debt} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '500' }} numberOfLines={1}>
            {tx.title || 'Expense'}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textTertiary, marginTop: 1 }}>
            {isMyPayer ? 'You paid' : `${friendPayer ? 'Friend paid' : ''}`} • {dateStr}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: isOwed ? colors.credit : colors.debt }}>
            {isOwed ? '+' : '-'}{symbol}{netAbs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.textTertiary, marginTop: 1 }}>
            {isOwed ? 'owed to you' : 'you owe'}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function FriendDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { theme: appTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const token = useStore(state => state.token);
  const myId = currentUser?.id ?? '';
  const myName = currentUser?.name ?? 'You';
  const symbol = currencySymbol(currentUser?.currency);

  const [remindSnack, setRemindSnack] = useState(false);
  const [remindSnackMsg, setRemindSnackMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [freshBreakdown, setFreshBreakdown] = useState<BalanceBreakdown[]>(route.params?.breakdown ?? []);
  const [directExpenses, setDirectExpenses] = useState<Expense[]>([]);
  const [removeFriendModalVisible, setRemoveFriendModalVisible] = useState(false);

  const loadDirectExpenses = useCallback(() => {
    if (!token) return;
    expensesService.getDirect().then(res => {
      const filtered = (res.expenses ?? [])
        .map((e: any) => apiExpenseToLocal(e))
        .filter((e: Expense) =>
          e.contextType === 'non_group' &&
          e.participants.some((p: Participant) => p.userId === route.params?.friendId),
        );
      setDirectExpenses(filtered);
    }).catch(() => {});
  }, [route.params?.friendId, token]);

  const loadBreakdown = useCallback(() => {
    if (!token) return;
    friendsService.getBalances().then(res => {
      const friend = res?.friends?.find((f: any) => f.friendId === route.params?.friendId);
      if (friend) setFreshBreakdown(friend.breakdown ?? []);
    }).catch(() => {});
  }, [route.params?.friendId, token]);

  const handleGearPress = useCallback(() => {
    haptics.light();
    setRemoveFriendModalVisible(true);
  }, []);

  const confirmRemoveFriend = useCallback(async () => {
    try {
      await friendsService.remove(route.params?.friendId);
      haptics.success();
    } catch {}
    setRemoveFriendModalVisible(false);
    navigation.goBack();
  }, [route.params?.friendId, navigation]);

  useFocusEffect(useCallback(() => {
    loadBreakdown();
    loadDirectExpenses();
  }, [loadBreakdown, loadDirectExpenses]));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: route.params?.friendName ?? 'Friend',
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="magnify"
            iconColor={colors.white}
            size={20}
            onPress={() => navigation.navigate('Search')}
          />
          <IconButton
            icon="cog-outline"
            iconColor={colors.white}
            size={20}
            onPress={handleGearPress}
          />
        </View>
      ),
    });
  }, [navigation, route.params?.friendName, colors.white, handleGearPress]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBreakdown();
    loadDirectExpenses();
    setTimeout(() => setRefreshing(false), 800);
  };

  const localDirectBalance = useMemo(() =>
    directExpenses.reduce((sum: number, e: Expense) => {
      const mySplit: number = e.splits.find((s: Split) => s.userId === myId)?.computedAmount ?? 0;
      const friendSplit: number = e.splits.find((s: Split) => s.userId === route.params?.friendId)?.computedAmount ?? 0;
      const myPayer: Payer | undefined = e.payers.find((p: Payer) => p.userId === myId && p.amountPaid > 0);
      const friendPayer: Payer | undefined = e.payers.find((p: Payer) => p.userId === route.params?.friendId && p.amountPaid > 0);
      const net = myPayer
        ? (myPayer.amountPaid - mySplit - friendSplit)
        : friendPayer
          ? (mySplit - friendPayer.amountPaid + friendSplit)
          : 0;
      return sum + net;
    }, 0),
    [directExpenses, myId, route.params?.friendId],
  );

  const groupNetBalance = useMemo(() =>
    freshBreakdown.reduce((sum, b) =>
      sum + (b.direction === 'owes_you' ? b.amount : -b.amount), 0),
    [freshBreakdown],
  );

  const netBalance = groupNetBalance + localDirectBalance;
  const isOwed = netBalance > 0.005;
  const isOwe = netBalance < -0.005;
  const absNet = Math.abs(netBalance);
  const hasDirectTx = directExpenses.length > 0;

  const handleRemind = () => {
    haptics.light();
    (async () => {
      try {
        await friendsService.remind(route.params?.friendId);
        haptics.success();
        setRemindSnackMsg(`Reminder sent to ${route.params?.friendName}`);
      } catch {
        setRemindSnackMsg('Could not send reminder. Try again.');
      }
      setRemindSnack(true);
    })();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle="light-content" />

      {/* Compact Purple Header */}
      <CompactHeader insets={insets} colors={colors} />

      {/* Avatar - overlapping header */}
      <View style={[styles.avatarContainer, { top: HEADER_H - 40 }]}>
        <View style={[styles.avatarRing, {
          borderColor: colors.primary,
          backgroundColor: colors.surfacePrimary,
        }]}>
          <AppAvatar
            user={{ _id: route.params?.friendId, name: route.params?.friendName, profilePic: route.params?.friendProfilePic }}
            size={80}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer for avatar */}
        <View style={{ height: 55 }} />

        {/* Name + Balance */}
        <View style={styles.infoSection}>
          <Text variant="titleLarge" style={{
            color: colors.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
          }}>
            {route.params?.friendName}
          </Text>

          <BalanceCard
            isOwed={isOwed}
            isOwe={isOwe}
            absNet={absNet}
            symbol={symbol}
            colors={colors}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableRipple
            onPress={() => {
              haptics.light();
              const settleMembers: MemberBalance[] = [
                { memberId: myId, name: myName, email: currentUser?.email ?? '', isMe: true, net: -netBalance },
                { memberId: route.params?.friendId, name: route.params?.friendName, email: '', isMe: false, net: netBalance },
              ];
              navigation.navigate('SettleUpModal', {
                groupId: 'direct',
                groupName: `Settlement with ${route.params?.friendName}`,
                members: settleMembers,
                preselectedMemberId: netBalance > 0 ? route.params?.friendId : myId,
              });
            }}
            style={[styles.actionBtn, { backgroundColor: '#F97316' }]}
          >
            <View style={styles.actionContent}>
              <Icon source="handshake" size={18} color={colors.white} />
              <Text variant="labelSmall" style={{ color: colors.white, fontWeight: '600', marginTop: 3 }}>
                Settle up
              </Text>
            </View>
          </TouchableRipple>

          <TouchableRipple
            onPress={handleRemind}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
          >
            <View style={styles.actionContent}>
              <Icon source="bell-outline" size={18} color={colors.textSecondary} />
              <Text variant="labelSmall" style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 3 }}>
                Remind
              </Text>
            </View>
          </TouchableRipple>

          <TouchableRipple
            onPress={() => {
              haptics.light();
              navigation.navigate('Analytics', { friendId: route.params?.friendId, friendName: route.params?.friendName });
            }}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
          >
            <View style={styles.actionContent}>
              <Icon source="chart-bar" size={18} color={colors.accentPurple} />
              <Text variant="labelSmall" style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 3 }}>
                Charts
              </Text>
            </View>
          </TouchableRipple>
        </View>

        {/* Shared Groups */}
        {freshBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{
              color: colors.textSecondary, fontWeight: '600',
              marginBottom: 8, marginLeft: 4,
            }}>
              Shared Groups
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surfacePrimary }]}>
              {freshBreakdown.map((b, i) => (
                <GroupRow
                  key={i}
                  b={b}
                  navigation={navigation}
                  colors={colors}
                  symbol={symbol}
                />
              ))}
            </View>
          </View>
        )}

        {/* Direct Transactions */}
        {hasDirectTx && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{
              color: colors.textSecondary, fontWeight: '600',
              marginBottom: 8, marginLeft: 4,
            }}>
              Direct Transactions
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surfacePrimary }]}>
              {directExpenses.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  myId={myId}
                  friendId={route.params?.friendId}
                  colors={colors}
                  symbol={symbol}
                  navigation={navigation}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!hasDirectTx && freshBreakdown.length === 0 && (
          <View style={[styles.section, { alignItems: 'center', marginTop: 40 }]}>
            <Icon source="account-cash" size={48} color={colors.textTertiary} />
            <Text variant="bodyMedium" style={{ color: colors.textTertiary, marginTop: 12, textAlign: 'center' }}>
              No transactions with {route.params?.friendName} yet
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FABs */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET }]} pointerEvents="box-none">
        <FAB
          icon="qrcode-scan"
          size="small"
          style={[styles.fabScan, { backgroundColor: appTheme.surface + 'CC', borderWidth: 1, borderColor: appTheme.outlineVariant + '60' }]}
          color={appTheme.textSecondary}
          onPress={() => { haptics.light(); navigation.navigate('QRScanner'); }}
        />
        <FAB
          icon="plus"
          style={[
            styles.fabAdd,
            {
              backgroundColor: appTheme.primary,
              borderRadius: 16,
              ...Platform.select({
                ios: { shadowColor: appTheme.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
                android: {},
              }),
            },
          ]}
          color="#FFFFFF"
          onPress={() => { haptics.light(); navigation.navigate('AddExpense', { friendId: route.params?.friendId }); }}
        />
      </View>

      <Snackbar
        visible={remindSnack}
        onDismiss={() => setRemindSnack(false)}
        duration={3000}
        style={{ backgroundColor: colors.surfaceHover }}
      >
        {remindSnackMsg}
      </Snackbar>

      {/* Remove Friend Modal */}
      <Portal>
        <Modal
          visible={removeFriendModalVisible}
          onDismiss={() => setRemoveFriendModalVisible(false)}
          contentContainerStyle={[styles.removeModal, { backgroundColor: appTheme.surface }]}
        >
          <View style={styles.removeModalHeader}>
            <View style={[styles.removeModalIcon, { backgroundColor: appTheme.error + '20' }]}>
              <Icon source="account-remove" size={28} color={appTheme.error} />
            </View>
            <Text variant="titleLarge" style={{ color: appTheme.text, fontWeight: '700', marginTop: 16 }}>
              Remove Friend?
            </Text>
            <Text variant="bodyMedium" style={{ color: appTheme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              This will remove {route.params?.friendName ?? 'this friend'} from your friends list. You can add them back later.
            </Text>
          </View>
          <View style={styles.removeModalActions}>
            <Button
              mode="outlined"
              onPress={() => setRemoveFriendModalVisible(false)}
              style={[styles.removeModalBtn, { borderColor: appTheme.border }]}
              labelStyle={{ color: appTheme.text }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirmRemoveFriend}
              buttonColor={appTheme.error}
              textColor="#FFFFFF"
              style={styles.removeModalBtn}
              icon="account-remove"
            >
              Remove
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Avatar
  avatarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 43,
    borderWidth: 3,
  },
  // Info section
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  balanceCard: {
    width: '100%',
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionContent: {
    alignItems: 'center',
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  groupRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.08)',
  },
  groupRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.08)',
  },
  txRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FABs
  fabContainer: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabScan: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fabMain: {
    elevation: 3,
  },

  // Remove friend modal
  removeModal: { marginHorizontal: 32, borderRadius: 20, padding: 24 },
  removeModalHeader: { alignItems: 'center' },
  removeModalIcon: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  removeModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  removeModalBtn: { flex: 1, borderRadius: 12 },
});