import React, { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  View, StyleSheet, FlatList, Share, Linking, Alert,
  PermissionsAndroid, Platform, ScrollView, RefreshControl,
  StatusBar, Pressable, Animated, ViewStyle,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text, TextInput, Button, Divider, ActivityIndicator,
  TouchableRipple, Portal, Modal, Banner, IconButton,
  FAB, Icon, Searchbar,
} from 'react-native-paper';
import Contacts from 'react-native-contacts';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import {
  friendsService, FriendUser, FriendRequest, FriendBalance, BalanceSummary,
} from '../services/friendsService';
import { normalizeCode } from './MyQRCodeScreen';
import AppAvatar from '../components/AppAvatar';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';

const { avatarPalette } = require('../theme/tokens');

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'CA$',
  AUD: 'A$', CHF: 'CHF', CNY: '¥', SGD: 'S$', HKD: 'HK$', AED: 'د.إ',
};

function currencySymbol(code?: string): string {
  if (!code) return '$';
  return CURRENCY_SYMBOLS[code] ?? code;
}

function formatAmount(n: number, symbol: string): string {
  return `${symbol}${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Pie Avatar (unchanged) ─────────────────────────────────────────────────
function PieAvatar({
  user,
  size = 44,
}: {
  user: { _id?: string; name: string; profilePic?: string };
  size?: number;
}) {
  const { colors } = useTheme();
  const id = user._id || user.name;

  const colors2 = useAppTheme().theme;

  if (user.profilePic) {
    return <AppAvatar user={user} size={size} />;
  }

  const segmentColors = [avatarColor(id), avatarColor(id + '2'), avatarColor(id + '3')];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          <Path d={describeArc(cx, cy, r, 0, 120)} fill={segmentColors[0]} />
          <Path d={describeArc(cx, cy, r, 120, 240)} fill={segmentColors[1]} />
          <Path d={describeArc(cx, cy, r, 240, 360)} fill={segmentColors[2]} />
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{
          color: '#fff', fontWeight: '700', fontSize: size * 0.35,
          textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
        }}>
          {(user.name?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (a: number) => (Math.PI / 180) * (a - 90);
  const start = { x: cx + r * Math.cos(toRad(endAngle)), y: cy + r * Math.sin(toRad(endAngle)) };
  const end = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

// ─── Glass hero summary ──────────────────────────────────────────────────────
function FriendsHeroCard({
  totalOwed, totalOwe, net, symbol, friendsOwedCount, friendsOweCount,
}: {
  totalOwed: number; totalOwe: number; net: number; symbol: string;
  friendsOwedCount: number; friendsOweCount: number;
}) {
  const { theme } = useAppTheme();
  const settled = Math.abs(net) <= 0.005;
  const netColor = settled ? theme.textSecondary : net > 0 ? theme.success : theme.warning;

  return (
    <View style={[styles.heroCard, { backgroundColor: theme.surface + 'E6', borderColor: theme.primary + '20' }]}>
      <View style={styles.heroSheen} pointerEvents="none" />

      {/* Net balance */}
      <View style={styles.heroTop}>
        <View>
          {settled ? (
            <>
              <Text variant="displaySmall" style={[styles.heroNet, { color: theme.textSecondary }]}>
                All settled up
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2 }}>
                No outstanding balances with friends
              </Text>
            </>
          ) : (
            <>
              <Text variant="displaySmall" style={[styles.heroNet, { color: netColor }]}>
                {net > 0 ? '+' : '-'}{symbol}{Math.abs(net).toFixed(2)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {net > 0
                  ? `You're owed ${symbol}${totalOwed.toFixed(2)} across ${friendsOwedCount} friend${friendsOwedCount !== 1 ? 's' : ''}`
                  : `You owe ${symbol}${totalOwe.toFixed(2)} across ${friendsOweCount} friend${friendsOweCount !== 1 ? 's' : ''}`}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Stat chips */}
      <View style={styles.statRow}>
        <View style={[styles.statChip, { borderTopColor: theme.success }]}>
          <Text variant="labelSmall" style={{ color: theme.textSecondary }}>Owed to you</Text>
          <Text variant="titleMedium" style={{ color: theme.success, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {symbol}{totalOwed.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={[styles.statChip, { borderTopColor: theme.warning }]}>
          <Text variant="labelSmall" style={{ color: theme.textSecondary }}>You owe</Text>
          <Text variant="titleMedium" style={{ color: theme.warning, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {symbol}{totalOwe.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={[styles.statChip, { borderTopColor: theme.primary }]}>
          <Text variant="labelSmall" style={{ color: theme.textSecondary }}>Net</Text>
          <Text variant="titleMedium" style={{ color: netColor, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {net >= 0 ? '+' : '-'}{symbol}{Math.abs(net).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Friend row (list-style, no card) ────────────────────────────────────────
function FriendRow({
  item, symbol, onPress, onLongPress,
}: {
  item: FriendBalance | FriendUser;
  symbol: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isBalance = 'netBalance' in item;
  const friend = item as FriendBalance;
  const settledUser = item as FriendUser;

  const name = isBalance ? friend.name : settledUser.name;
  const profilePic = isBalance ? friend.profilePic : settledUser.profilePic;
  const friendId = isBalance ? friend.friendId : settledUser._id;

  const netBalance = isBalance ? friend.netBalance : 0;
  const breakdown = isBalance ? friend.breakdown : [];
  const owedToMe = netBalance > 0.005;
  const isOwe = netBalance < -0.005;
  const settled = !owedToMe && !isOwe;

  const netColor = settled ? theme.textSecondary : owedToMe ? theme.success : theme.warning;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.rowWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => { haptics.selection(); onPress(); }}
        onLongPress={onLongPress ? () => { haptics.light(); onLongPress(); } : undefined}
        style={({ pressed }) => [styles.friendRow, { opacity: pressed ? 0.8 : 1 }]}
      >
        {/* Balance direction indicator */}
        <View style={[
          styles.balanceIndicator,
          { backgroundColor: netColor },
        ]} />

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <PieAvatar
            user={{ _id: friendId, name, profilePic }}
            size={44}
          />
        </View>

        {/* Name + breakdown */}
        <View style={styles.friendInfo}>
          <View style={styles.friendNameRow}>
            <Text variant="bodyLarge" style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
              {name}
            </Text>
            {isBalance && !settled && (
              <Text variant="titleSmall" style={{ color: netColor, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {netBalance > 0 ? '+' : '-'}{symbol}{Math.abs(netBalance).toFixed(2)}
              </Text>
            )}
            {settled && (
              <Text variant="labelSmall" style={{ color: theme.textSecondary }}>settled</Text>
            )}
          </View>

          {isBalance && breakdown.length > 0 && (
            <Text variant="bodySmall" style={[styles.breakdownHint, { color: theme.textSecondary }]} numberOfLines={1}>
              {breakdown[0].direction === 'owes_you'
                ? `${name.split(' ')[0]} owes you in ${breakdown[0].groupName}`
                : `You owe in ${breakdown[0].groupName}`}
              {breakdown.length > 1 && ` · +${breakdown.length - 1} more`}
            </Text>
          )}
          {!isBalance && (
            <Text variant="bodySmall" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {settledUser.email}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Icon source="chevron-right" size={18} color={theme.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Request row ────────────────────────────────────────────────────────────
function RequestRow({
  x, kind, actionIds, onAccept, onReject, onCancel,
}: {
  x: { kind: 'received' | 'sent'; item: FriendRequest };
  kind: 'received' | 'sent';
  actionIds: Set<string>;
  onAccept: (r: FriendRequest) => void;
  onReject: (r: FriendRequest) => void;
  onCancel: (r: FriendRequest) => void;
}) {
  const { theme } = useAppTheme();
  const { item } = x;
  const sender = kind === 'received' ? item.sender : item.receiver;
  const busy = actionIds.has(item._id);

  return (
    <View style={styles.requestRow}>
      <AppAvatar user={sender} size={40} />
      <View style={styles.requestInfo}>
        <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>{sender.name}</Text>
        <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{sender.email}</Text>
      </View>
      {kind === 'received' ? (
        <View style={styles.requestActions}>
          <Button
            mode="contained" compact
            loading={busy}
            disabled={busy}
            onPress={() => onAccept(item)}
            style={[styles.reqBtn, { backgroundColor: theme.primary }]}
          >
            Accept
          </Button>
          <Button
            mode="text" compact textColor={theme.error}
            onPress={() => onReject(item)}
            style={styles.reqDecline}
          >
            Decline
          </Button>
        </View>
      ) : (
        <View style={styles.requestActions}>
          <Text variant="labelSmall" style={{ color: theme.textSecondary }}>Pending</Text>
          <Button
            mode="text" compact textColor={theme.error}
            onPress={() => onCancel(item)}
            style={styles.reqDecline}
          >
            Cancel
          </Button>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
type ActiveView = 'balances' | 'requests';

export default function FriendsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const token = useStore(state => state.token);
  const symbol = currencySymbol(currentUser?.currency);

  const [view, setView] = useState<ActiveView>('balances');
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [query, setQuery] = useState('');

  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareTab, setShareTab] = useState<'code' | 'search' | 'contacts' | 'invite'>('code');
  const [showSettled, setShowSettled] = useState(false);

  const [directInput, setDirectInput] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [directResult, setDirectResult] = useState<'sent' | 'notfound' | 'multiple' | ''>('');
  const [directMatches, setDirectMatches] = useState<FriendUser[]>([]);

  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeResult, setCodeResult] = useState<'sent' | 'notfound' | 'invalid' | ''>('');

  const [contactsPermission, setContactsPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [contactMatches, setContactMatches] = useState<FriendUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setApiError(null);
    const [balRes, friendsRes, reqRes, sentReqRes] = await Promise.allSettled([
      friendsService.getBalances(),
      friendsService.getFriends(),
      friendsService.getRequests(),
      friendsService.getSentRequests(),
    ]);
    if (balRes.status === 'fulfilled') setBalanceSummary(balRes.value);
    else setApiError('Could not load balances — tap to retry');
    if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value.friends);
    if (reqRes.status === 'fulfilled') setRequests(reqRes.value.requests);
    if (sentReqRes.status === 'fulfilled') setSentRequests(sentReqRes.value.requests);
    setLoading(false);
    setRefreshing(false);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Build combined friend list from API balances + local store (no backend call needed)
  const uniqueFriends = useMemo(() => {
    const all: FriendUser[] = [
      ...(balanceSummary?.friends.map(f => ({ _id: f.friendId, name: f.name, email: f.email ?? '', profilePic: f.profilePic ?? '' })) ?? []),
      ...friends,
    ];
    return all.reduce<FriendUser[]>((acc, f) => {
      if (!acc.some(ex => ex._id === f._id)) acc.push(f);
      return acc;
    }, []);
  }, [balanceSummary, friends]);

  // No separate search effect needed — query directly filters displayedList

  const requestContactsPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        { title: 'Contacts Permission', message: 'OnTheTab needs access to your contacts to find friends.', buttonPositive: 'Allow', buttonNegative: 'Deny' },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    const permission = await Contacts.requestPermission();
    return permission === 'authorized';
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const granted = await requestContactsPermission();
      if (!granted) { setContactsPermission('denied'); return; }
      setContactsPermission('granted');
      const deviceContacts = await Contacts.getAll();
      const phones: string[] = [];
      const emails: string[] = [];
      deviceContacts.forEach(c => {
        c.phoneNumbers.forEach(p => phones.push(p.number));
        c.emailAddresses.forEach(e => emails.push(e.email));
      });
      const data = await friendsService.matchContacts(phones, emails);
      setContactMatches(data.users);
      setContactsLoaded(true);
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not load contacts.'); }
    finally { setContactsLoading(false); }
  };

  const markBusy = (id: string) => setActionIds(s => new Set(s).add(id));
  const unmarkBusy = (id: string) =>
    setActionIds(s => { const n = new Set(s); n.delete(id); return n; });

  const sendRequest = async (userId: string, fromContacts = false) => {
    haptics.light(); markBusy(userId);
    try {
      await friendsService.sendRequest(userId);
      if (fromContacts) setContactMatches(prev => prev.filter(u => u._id !== userId));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(userId); }
  };

  const accept = async (req: FriendRequest) => {
    haptics.success(); markBusy(req._id);
    try {
      await friendsService.accept(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
      setFriends(prev => [req.sender, ...prev]);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const reject = async (req: FriendRequest) => {
    haptics.light(); markBusy(req._id);
    try {
      await friendsService.reject(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const cancelSent = async (req: FriendRequest) => {
    haptics.light(); markBusy(req._id);
    try {
      await friendsService.remove(req.receiver._id);
      setSentRequests(prev => prev.filter(r => r._id !== req._id));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const removeFriend = (friendId: string, friendName: string) => {
    Alert.alert('Remove Friend', `Remove ${friendName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await friendsService.remove(friendId).catch(() => {});
          setFriends(prev => prev.filter(f => f._id !== friendId));
          setBalanceSummary(prev =>
            prev ? { ...prev, friends: prev.friends.filter(f => f.friendId !== friendId) } : prev,
          );
        },
      },
    ]);
  };

  const handleAddByCode = async () => {
    if (!currentUser) { Alert.alert('Sign In Required'); return; }
    const normalized = normalizeCode(codeInput);
    if (!/^[a-f0-9]{24}$/.test(normalized)) { setCodeResult('invalid'); return; }
    haptics.light(); setCodeLoading(true); setCodeResult('');
    try {
      await friendsService.sendRequest(normalized);
      setCodeResult('sent'); setCodeInput('');
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) setCodeResult('notfound');
      else Alert.alert('Error', msg || 'Could not send friend request.');
    } finally { setCodeLoading(false); }
  };

  const handleDirectAdd = async () => {
    if (!currentUser) { Alert.alert('Sign In Required'); return; }
    const val = directInput.trim();
    if (!val) return;
    haptics.light(); setDirectLoading(true); setDirectResult(''); setDirectMatches([]);
    try {
      const data = await friendsService.search(val);
      if (data.users.length === 0) { setDirectResult('notfound'); return; }
      if (data.users.length > 1) { setDirectMatches(data.users); setDirectResult('multiple'); return; }
      await friendsService.sendRequest(data.users[0]._id);
      setDirectResult('sent'); setDirectInput('');
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not send friend request.'); }
    finally { setDirectLoading(false); }
  };

  const handleDirectAddToUser = async (userId: string) => {
    haptics.light();
    try {
      await friendsService.sendRequest(userId);
      setDirectMatches(prev => prev.filter(u => u._id !== userId));
      if (directMatches.length <= 1) { setDirectResult('sent'); setDirectInput(''); }
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not send friend request.'); }
  };

  const closeModal = () => {
    setShareModalVisible(false);
    setShareTab('code');
    setDirectInput(''); setDirectResult(''); setDirectMatches([]);
    setCodeInput(''); setCodeResult('');
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        query.length > 0 ? (
          <Searchbar
            placeholder="Search friends…"
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
          <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>Friends</Text>
        )
      ),
      headerRight: () => (
        query.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {requests.length > 0 && (
              <TouchableRipple
                onPress={() => setView(view === 'requests' ? 'balances' : 'requests')}
                style={[
                  styles.requestsBadge,
                  { backgroundColor: view === 'requests' ? theme.primary : 'transparent', borderColor: theme.primary },
                ]}
              >
                <Text variant="labelSmall" style={{ color: view === 'requests' ? colors.white : theme.primary }}>
                  {requests.length}
                </Text>
              </TouchableRipple>
            )}
            <IconButton icon="magnify" size={24} iconColor={theme.text} onPress={() => setQuery(' ')} style={{ padding: 10 }} />
            <IconButton icon="account-plus-outline" size={24} iconColor={theme.primary} onPress={() => setShareModalVisible(true)} style={{ padding: 10 }} />
          </View>
        )
      ),
    });
  }, [navigation, theme, requests.length, view, query]);

  const inviteLink = `fincoord://invite?ref=${currentUser?.id}`;
  const inviteText = `Hey! I'm using OnTheTab to track shared expenses. Add me: ${inviteLink}`;
  const shareWhatsApp = () => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteText)}`).catch(() => Alert.alert('WhatsApp not installed'));
  const shareSMS = () => Linking.openURL(`sms:?body=${encodeURIComponent(inviteText)}`).catch(() => {});
  const shareGeneric = () => Share.share({ message: inviteText, title: 'Join me on OnTheTab' });

  if (!token) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>Sign in to use Friends.</Text>
      </View>
    );
  }

  const apiFriends = balanceSummary?.friends ?? [];
  const totalOwed = apiFriends.reduce((sum, f) => (f.netBalance > 0 ? sum + f.netBalance : sum), 0);
  const totalOwe = apiFriends.reduce((sum, f) => (f.netBalance < 0 ? sum + Math.abs(f.netBalance) : sum), 0);
  const net = totalOwed - totalOwe;
  const friendsOwedCount = apiFriends.filter(f => f.netBalance > 0).length;
  const friendsOweCount = apiFriends.filter(f => f.netBalance < 0).length;

  const balancedIds = new Set(balanceSummary?.friends.map(f => f.friendId) ?? []);
  const trulySettledFriends = friends.filter(fr => !balancedIds.has(fr._id));

  type ListItem = { type: 'balance'; data: FriendBalance } | { type: 'settled'; data: FriendUser };
  const listData: ListItem[] = [
    ...(balanceSummary?.friends ?? []).map(f => ({ type: 'balance' as const, data: f })),
    ...trulySettledFriends.map(f => ({ type: 'settled' as const, data: f })),
  ];
  const displayedList = showSettled ? listData : listData.filter(item => item.type === 'balance');
  const settledCount = trulySettledFriends.length;

  // Filter friends list in-place when query is active
  const filteredList = useMemo(() => {
    if (!query.trim()) return displayedList;
    const q = query.toLowerCase().trim();
    return displayedList.filter(item => {
      const name = item.type === 'balance' ? item.data.name : item.data.name;
      return name.toLowerCase().includes(q);
    });
  }, [query, displayedList]);

  // All friend rows for FlatList
  const allRequestItems = [
    ...requests.map(r => ({ kind: 'received' as const, item: r })),
    ...sentRequests.map(r => ({ kind: 'sent' as const, item: r })),
  ];

  const hasAnyPeople = friends.length > 0 || apiFriends.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ══ CONTENT ════════════════════════════════════════════════════════════ */}
      {view === 'requests' ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.requestsBar, { backgroundColor: theme.surface }]}>
            <Text variant="titleMedium" style={{ color: theme.text }}>Friend Requests</Text>
            <Button mode="text" onPress={() => setView('balances')}>Done</Button>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <FlatList
            data={allRequestItems}
            keyExtractor={x => x.item._id + x.kind}
            ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            ListEmptyComponent={<Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>No pending requests.</Text>}
            ListHeaderComponent={requests.length > 0 ? (
              <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>RECEIVED</Text>
            ) : null}
            renderItem={({ item: x, index }) => {
              const prevKind = index > 0 ? allRequestItems[index - 1]?.kind : null;
              const showSentHeader = x.kind === 'sent' && prevKind !== 'sent';
              return (
                <>
                  {showSentHeader && (
                    <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>SENT</Text>
                  )}
                  <RequestRow
                    x={x} kind={x.kind}
                    actionIds={actionIds}
                    onAccept={accept} onReject={reject} onCancel={cancelSent}
                  />
                </>
              );
            }}
            contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
          />
        </View>
      ) : (
        /* ── Balances view ── */
        <>
          {apiError && (
            <Banner visible actions={[{ label: 'Retry', onPress: () => load() }]} icon="wifi-off">
              {apiError}
            </Banner>
          )}

          {/* Hero summary — always visible */}
          {!loading && hasAnyPeople && (
            <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
              <FriendsHeroCard
                totalOwed={totalOwed}
                totalOwe={totalOwe}
                net={net}
                symbol={symbol}
                friendsOwedCount={friendsOwedCount}
                friendsOweCount={friendsOweCount}
              />
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : filteredList.length === 0 && query.length > 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>
              <Icon source="account-search-outline" size={48} color={theme.textTertiary} />
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 12 }}>
                No friends match "{query}"
              </Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={filteredList}
              keyExtractor={item => item.type === 'balance' ? item.data.friendId : item.data._id}
              ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} colors={[theme.primary]} />
              }
              ListHeaderComponent={
                filteredList.length > 0 && !showSettled && settledCount > 0 ? (
                  <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
                    <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      {filteredList.length} FRIEND{filteredList.length !== 1 ? 'S' : ''} WITH BALANCES
                    </Text>
                  </View>
                ) : filteredList.length > 0 ? (
                  <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
                    <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      {filteredList.length} FRIEND{filteredList.length !== 1 ? 'S' : ''}
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                if (item.type === 'balance') {
                  const fb = item.data;
                  return (
                    <FriendRow
                      item={item.data}
                      symbol={symbol}
                      onPress={() => navigation.navigate('FriendDetail', {
                        friendId: fb.friendId, friendName: fb.name,
                        friendProfilePic: fb.profilePic, netBalance: fb.netBalance, breakdown: fb.breakdown,
                      })}
                      onLongPress={() => removeFriend(fb.friendId, fb.name)}
                    />
                  );
                }
                return (
                  <FriendRow
                    item={item.data}
                    symbol={symbol}
                    onPress={() => navigation.navigate('FriendDetail', {
                      friendId: item.data._id, friendName: item.data.name,
                      friendProfilePic: item.data.profilePic, netBalance: 0, breakdown: [],
                    })}
                    onLongPress={() => removeFriend(item.data._id, item.data.name)}
                  />
                );
              }}
              ListFooterComponent={() => (
                settledCount > 0 ? (
                  <View style={styles.settledToggle}>
                    {!showSettled ? (
                      <>
                        <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 10 }}>
                          {settledCount} settled friend{settledCount > 1 ? 's' : ''} hidden
                        </Text>
                        <Button
                          mode="outlined"
                          onPress={() => setShowSettled(true)}
                          style={[styles.outlinedBtn, { borderColor: theme.primary }]}
                          textColor={theme.primary}
                        >
                          Show {settledCount} settled friend{settledCount > 1 ? 's' : ''}
                        </Button>
                      </>
                    ) : (
                      <Button
                        mode="outlined"
                        onPress={() => setShowSettled(false)}
                        style={[styles.outlinedBtn, { borderColor: theme.border }]}
                        textColor={theme.textSecondary}
                      >
                        Hide settled friends
                      </Button>
                    )}
                  </View>
                ) : null
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="account-group-outline"
                  title="No friends yet."
                  subtitle="Tap the + icon to get started."
                />
              }
            />
          )}
        </>
      )}

      {/* ══ FABs ══════════════════════════════════════════════════════════════ */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET, alignItems: 'center' }]} pointerEvents="box-none">
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
          onPress={() => { haptics.medium(); navigation.navigate('AddExpense'); }}
        />
      </View>

      {/* ══ Add Friend Modal ════════════════════════════════════════════════ */}
      <Portal>
        <Modal
          visible={shareModalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          {/* Top accent bar */}
          <View style={[styles.modalTopBar, { backgroundColor: theme.primary }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.text }]}>Add Friend</Text>
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>Connect with people you trust</Text>
            </View>
            <IconButton icon="close" size={20} iconColor={theme.textSecondary} onPress={closeModal} style={{ margin: 0 }} />
          </View>

          {/* QR Scan — full-width hero button */}
          <TouchableRipple
            onPress={() => { closeModal(); navigation.navigate('QRScanner'); }}
            rippleColor={theme.primary + '20'}
            style={[styles.qrHeroBtn, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '30' }]}
          >
            <View style={styles.qrHeroInner}>
              <View style={[styles.qrIconRing, { borderColor: theme.primary + '40' }]}>
                <View style={[styles.qrIconInner, { backgroundColor: theme.primary + '20' }]}>
                  <Icon source="qrcode-scan" size={28} color={theme.primary} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.text, fontWeight: '700' }}>Scan QR Code</Text>
                <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>Point your camera at a friend's code</Text>
              </View>
              <Icon source="chevron-right" size={22} color={theme.textTertiary} />
            </View>
          </TouchableRipple>

          {/* Tab selector */}
          <View style={[styles.tabRow, { borderColor: theme.border }]}>
            {(['code', 'search', 'contacts', 'invite'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => { haptics.selection(); setShareTab(tab); }}
                style={[
                  styles.tab,
                  shareTab === tab && { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' },
                ]}
              >
                <Icon
                  source={
                    tab === 'code' ? 'pound' :
                    tab === 'search' ? 'account-search-outline' :
                    tab === 'contacts' ? 'contacts-outline' :
                    'link-variant'
                  }
                  size={16}
                  color={shareTab === tab ? theme.primary : theme.textSecondary}
                />
                <Text
                  variant="labelSmall"
                  style={{
                    color: shareTab === tab ? theme.primary : theme.textSecondary,
                    fontWeight: shareTab === tab ? '700' : '500',
                    marginTop: 3,
                  }}
                >
                  {tab === 'code' ? 'Code' : tab === 'search' ? 'Search' : tab === 'contacts' ? 'Contacts' : 'Invite'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* ── TAB: By Code ── */}
            {shareTab === 'code' && (
              <View style={styles.tabContent}>
                <View style={[styles.glassCard, { borderColor: theme.border + '60' }]}>
                  <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 12, letterSpacing: 0.06 }}>
                    ENTER FRIEND CODE
                  </Text>
                  <TextInput
                    mode="flat"
                    placeholder="e.g. 507f1e77bcf86cd799439011"
                    value={codeInput}
                    onChangeText={t => { setCodeInput(t); setCodeResult(''); }}
                    autoCapitalize="none" autoCorrect={false}
                    left={<TextInput.Icon icon="pound" color={theme.textSecondary} />}
                    style={[styles.modalInput, { backgroundColor: theme.background + 'AA' }]}
                    textColor={theme.text}
                    placeholderTextColor={theme.textTertiary}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    dense
                  />
                  {codeResult === 'invalid' && (
                    <View style={styles.feedbackRow}>
                      <Icon source="alert-circle" size={15} color={theme.error} />
                      <Text variant="bodySmall" style={{ color: theme.error, marginLeft: 6 }}>
                        Invalid code — should be 24 hex characters.
                      </Text>
                    </View>
                  )}
                  {codeResult === 'notfound' && (
                    <View style={styles.feedbackRow}>
                      <Icon source="alert-circle" size={15} color={theme.error} />
                      <Text variant="bodySmall" style={{ color: theme.error, marginLeft: 6 }}>
                        No user found with that code.
                      </Text>
                    </View>
                  )}
                  {codeResult === 'sent' && (
                    <View style={[styles.feedbackRow, { backgroundColor: theme.success + '15', padding: 10, borderRadius: 8 }]}>
                      <Icon source="check-circle" size={16} color={theme.success} />
                      <Text variant="bodySmall" style={{ color: theme.success, fontWeight: '600', marginLeft: 6 }}>
                        Friend request sent!
                      </Text>
                    </View>
                  )}
                  <Button
                    mode="contained"
                    loading={codeLoading}
                    disabled={codeLoading || !codeInput.trim() || codeResult === 'sent'}
                    onPress={handleAddByCode}
                    style={styles.primaryBtn}
                    contentStyle={styles.primaryBtnContent}
                  >
                    {codeResult === 'sent' ? 'Sent!' : 'Add Friend'}
                  </Button>
                </View>
              </View>
            )}

            {/* ── TAB: Search ── */}
            {shareTab === 'search' && (
              <View style={styles.tabContent}>
                <View style={[styles.glassCard, { borderColor: theme.border + '60' }]}>
                  <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 12, letterSpacing: 0.06 }}>
                    SEARCH BY EMAIL OR PHONE
                  </Text>
                  <TextInput
                    mode="flat"
                    placeholder="name@email.com or +1 555 000 0000"
                    value={directInput}
                    onChangeText={t => { setDirectInput(t); setDirectResult(''); setDirectMatches([]); }}
                    keyboardType="default" autoCapitalize="none"
                    left={<TextInput.Icon icon="account-search-outline" color={theme.textSecondary} />}
                    style={[styles.modalInput, { backgroundColor: theme.background + 'AA' }]}
                    textColor={theme.text}
                    placeholderTextColor={theme.textTertiary}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    dense
                  />
                  {directResult === 'notfound' && (
                    <View style={styles.feedbackRow}>
                      <Icon source="alert-circle" size={15} color={theme.error} />
                      <Text variant="bodySmall" style={{ color: theme.error, marginLeft: 6 }}>
                        No user found with that email or phone.
                      </Text>
                    </View>
                  )}
                  {directResult === 'sent' && (
                    <View style={[styles.feedbackRow, { backgroundColor: theme.success + '15', padding: 10, borderRadius: 8 }]}>
                      <Icon source="check-circle" size={16} color={theme.success} />
                      <Text variant="bodySmall" style={{ color: theme.success, fontWeight: '600', marginLeft: 6 }}>
                        Friend request sent!
                      </Text>
                    </View>
                  )}
                  {directResult === 'multiple' && directMatches.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: 10 }}>
                        Multiple matches found:
                      </Text>
                      {directMatches.map(u => (
                        <View key={u._id} style={[styles.matchRow, { borderColor: theme.border + '40' }]}>
                          <AppAvatar user={u} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>{u.name}</Text>
                            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{u.email}</Text>
                          </View>
                          <Button mode="contained" compact onPress={() => handleDirectAddToUser(u._id)}
                            style={{ backgroundColor: theme.primary }}>Add</Button>
                        </View>
                      ))}
                    </View>
                  )}
                  {directResult !== 'multiple' && (
                    <Button
                      mode="contained"
                      loading={directLoading}
                      disabled={directLoading || !directInput.trim() || directResult === 'sent'}
                      onPress={handleDirectAdd}
                      style={styles.primaryBtn}
                      contentStyle={styles.primaryBtnContent}
                    >
                      Search & Send Request
                    </Button>
                  )}
                </View>
              </View>
            )}

            {/* ── TAB: Contacts ── */}
            {shareTab === 'contacts' && (
              <View style={styles.tabContent}>
                <View style={[styles.glassCard, { borderColor: theme.border + '60' }]}>
                  {!contactsLoaded ? (
                    <>
                      <View style={styles.contactsIconRow}>
                        <View style={[styles.contactsIconWrap, { backgroundColor: theme.primary + '14' }]}>
                          <Icon source="contacts-outline" size={28} color={theme.primary} />
                        </View>
                      </View>
                      <Text variant="bodyMedium" style={{ color: theme.text, textAlign: 'center', marginBottom: 6 }}>
                        Find friends from your contacts
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                        We'll show you which of your contacts are already on OnTheTab
                      </Text>
                      <Button
                        mode="contained"
                        icon="contacts-outline"
                        loading={contactsLoading}
                        onPress={loadContacts}
                        style={styles.primaryBtn}
                        contentStyle={styles.primaryBtnContent}
                      >
                        {contactsPermission === 'denied' ? 'Permission Denied' : 'Allow Access to Contacts'}
                      </Button>
                    </>
                  ) : contactMatches.length === 0 ? (
                    <>
                      <View style={{ alignItems: 'center', marginBottom: 12 }}>
                        <Icon source="account-group-outline" size={40} color={theme.textTertiary} />
                      </View>
                      <Text variant="bodyMedium" style={{ color: theme.text, textAlign: 'center', marginBottom: 6 }}>
                        No contacts found
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                        None of your contacts are on OnTheTab yet. Invite them!
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 12, letterSpacing: 0.06 }}>
                        {contactMatches.length} CONTACT{contactMatches.length !== 1 ? 'S' : ''} ON OnTheTab
                      </Text>
                      {contactMatches.map(u => (
                        <View key={u._id} style={[styles.matchRow, { borderColor: theme.border + '40' }]}>
                          <AppAvatar user={u} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>{u.name}</Text>
                            <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{u.email}</Text>
                          </View>
                          <Button mode="contained" compact onPress={() => sendRequest(u._id, true)}
                            style={{ backgroundColor: theme.primary }}>Add</Button>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>
            )}

            {/* ── TAB: Invite ── */}
            {shareTab === 'invite' && (
              <View style={styles.tabContent}>
                {/* Your invite code card */}
                <View style={[styles.glassCard, { borderColor: theme.primary + '30' }]}>
                  <View style={[styles.inviteCodeBox, { backgroundColor: theme.primary + '12' }]}>
                    <Icon source="link-variant" size={18} color={theme.primary} />
                    <Text variant="bodySmall" style={[styles.inviteCodeText, { color: theme.text }]} numberOfLines={1}>
                      {inviteLink}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 10, marginBottom: 16, textAlign: 'center' }}>
                    Share your link — anyone who opens it can add you
                  </Text>
                  <Button
                    icon="share-variant"
                    mode="contained"
                    onPress={shareGeneric}
                    style={styles.primaryBtn}
                    contentStyle={styles.primaryBtnContent}
                  >
                    Share Invite Link
                  </Button>
                </View>

                {/* Quick share chips */}
                <Text variant="labelSmall" style={{ color: theme.textSecondary, marginTop: 20, marginBottom: 12, letterSpacing: 0.06, textAlign: 'center' }}>
                  QUICK SHARE
                </Text>
                <View style={styles.shareChipsRow}>
                  <TouchableRipple
                    onPress={shareWhatsApp}
                    style={[styles.shareChip, { backgroundColor: '#25D36620', borderColor: '#25D36640' }]}
                  >
                    <View style={styles.shareChipInner}>
                      <Icon source="whatsapp" size={20} color="#25D366" />
                      <Text variant="labelSmall" style={{ color: '#25D366', marginTop: 3 }}>WhatsApp</Text>
                    </View>
                  </TouchableRipple>
                  <TouchableRipple
                    onPress={shareSMS}
                    style={[styles.shareChip, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '30' }]}
                  >
                    <View style={styles.shareChipInner}>
                      <Icon source="message-text-outline" size={20} color={theme.primary} />
                      <Text variant="labelSmall" style={{ color: theme.primary, marginTop: 3 }}>SMS</Text>
                    </View>
                  </TouchableRipple>
                  <TouchableRipple
                    onPress={shareGeneric}
                    style={[styles.shareChip, { backgroundColor: theme.surfaceVariant + '60', borderColor: theme.border + '40' }]}
                  >
                    <View style={styles.shareChipInner}>
                      <Icon source="share-variant" size={20} color={theme.textSecondary} />
                      <Text variant="labelSmall" style={{ color: theme.textSecondary, marginTop: 3 }}>More</Text>
                    </View>
                  </TouchableRipple>
                </View>
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

// ══ Styles ════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  inlineSearch: { flex: 1, height: 48, borderRadius: 12 },
  requestsBadge: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  headerIconBtn: { padding: 10 },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    // Uses inline style: backgroundColor=theme.surface+'E6', borderColor=theme.primary+'20'
    overflow: 'hidden',
  },
  heroSheen: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroTop: { flexDirection: 'column', alignItems: 'flex-start' },
  heroNet: { fontWeight: '700', fontSize: 28, letterSpacing: -0.5 },
  statRow: { flexDirection: 'row', marginTop: 16 },
  statChip: { flex: 1, borderTopWidth: 2, paddingTop: 10, paddingHorizontal: 4 },
  statDivider: { width: 1, marginHorizontal: 12, alignSelf: 'stretch', marginTop: 2 },

  // ── Friend row (list-style) ────────────────────────────────────────────────
  rowWrapper: { overflow: 'hidden' },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 16, paddingVertical: 12,
    gap: 0,
  },
  balanceIndicator: {
    width: 3, alignSelf: 'stretch', marginRight: 14,
    borderTopRightRadius: 2, borderBottomRightRadius: 2,
    minHeight: 48,
  },
  avatarWrap: { marginRight: 12 },
  friendInfo: { flex: 1, paddingRight: 8 },
  friendNameRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  },
  friendName: { flex: 1, fontWeight: '600' },
  breakdownHint: { marginTop: 2 },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 73 },

  // ── Section ────────────────────────────────────────────────────────────────
  sectionLabel: {
    letterSpacing: 0.08, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    fontSize: 11, textTransform: 'uppercase', fontWeight: '600',
  },

  // ── Requests ───────────────────────────────────────────────────────────────
  requestsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  requestRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  requestInfo: { flex: 1 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqBtn: { borderRadius: 8 },
  reqDecline: { paddingHorizontal: 4 },

  // ── Search row ─────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  friendBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },

  // ── FABs ──────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
  },
  fabScan: {},
  fabAdd: {},

  // ── Settled toggle ────────────────────────────────────────────────────────
  settledToggle: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  outlinedBtn: { borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 10 },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modal: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 0,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalTopBar: {
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
  },
  modalTitle: { fontWeight: '700', fontSize: 22, letterSpacing: -0.3 },
  modalScrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  qrHeroBtn: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  qrHeroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qrIconRing: {
    width: 56, height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrIconInner: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
    marginBottom: -1,
  },
  tabContent: { marginTop: 16 },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalInput: {
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
    gap: 6,
  },
  primaryBtn: {
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnContent: { paddingVertical: 8 },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactsIconRow: { alignItems: 'center', marginBottom: 12 },
  contactsIconWrap: {
    width: 60, height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  inviteCodeText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  shareChipsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  shareChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  shareChipInner: { alignItems: 'center' },
  emptyText: { textAlign: 'center', padding: 32, lineHeight: 22 },
});