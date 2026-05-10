import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Share, Linking, Alert,
  PermissionsAndroid, Platform, ScrollView, RefreshControl,
  StatusBar,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text, TextInput, Button, Divider, ActivityIndicator,
  TouchableRipple, Portal, Modal, Banner, IconButton,
  FAB, Surface,
} from 'react-native-paper';
import Contacts from 'react-native-contacts';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import {
  friendsService, FriendUser, FriendRequest, FriendBalance, BalanceSummary,
} from '../services/friendsService';
import { normalizeCode } from './MyQRCodeScreen';
import AppAvatar from '../components/AppAvatar';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';

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

function pieColors(id: string): string[] {
  const c1 = avatarColor(id);
  const c2 = avatarColor(id + '2');
  const c3 = avatarColor(id + '3');
  return [c1, c2, c3];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (Math.PI / 180) * (angleDeg - 90);
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function PieAvatar({
  user,
  size = 48,
}: {
  user: { _id?: string; name: string; profilePic?: string };
  size?: number;
}) {
  const id = user._id || user.name;
  if (user.profilePic) {
    return (
      <AppAvatar
        user={user}
        size={size}
      />
    );
  }
  const colors = pieColors(id);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          <Path d={describeArc(cx, cy, r, 0, 120)} fill={colors[0]} />
          <Path d={describeArc(cx, cy, r, 120, 240)} fill={colors[1]} />
          <Path d={describeArc(cx, cy, r, 240, 360)} fill={colors[2]} />
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: size * 0.35, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
          {(user.name?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

type ActiveView = 'balances' | 'requests';

export default function FriendsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const localExpenses = useStore(state => state.expenses);
  const symbol = currencySymbol(currentUser?.currency);
  const myId = currentUser?.id ?? '';

  const localDirectBalances = useMemo(() => {
    const result: Record<string, number> = {};
    for (const e of localExpenses.filter(ex => ex.groupId === 'direct')) {
      if (e.payerId === myId) {
        for (const [uid, amt] of Object.entries(e.splitDetails)) {
          if (uid !== myId) result[uid] = (result[uid] ?? 0) + amt;
        }
      } else {
        const myShare = e.splitDetails[myId] ?? 0;
        if (myShare > 0) result[e.payerId] = (result[e.payerId] ?? 0) - myShare;
      }
    }
    return result;
  }, [localExpenses, myId]);

  const localFriendNames = useMemo(() => {
    const result: Record<string, string> = {};
    for (const e of localExpenses.filter(ex => ex.groupId === 'direct')) {
      if (e.participantNames) {
        for (const [id, name] of Object.entries(e.participantNames)) {
          if (id !== myId) result[id] = name;
        }
      }
    }
    return result;
  }, [localExpenses, myId]);

  const [view, setView] = useState<ActiveView>('balances');
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);

  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const [shareModalVisible, setShareModalVisible] = useState(false);
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
    if (balRes.status === 'fulfilled') {
      setBalanceSummary(balRes.value);
    } else {
      setApiError('Could not load balances — tap to retry');
    }
    if (friendsRes.status === 'fulfilled') setFriends(friendsRes.value.friends);
    if (reqRes.status === 'fulfilled') setRequests(reqRes.value.requests);
    if (sentReqRes.status === 'fulfilled') setSentRequests(sentReqRes.value.requests);
    setLoading(false);
    setRefreshing(false);
  }, [currentUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await friendsService.search(query);
        setSearchResults(data.users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 500);
  }, [query]);

  const requestContactsPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'FinCoord needs access to your contacts to find friends.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
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
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load contacts.');
    } finally {
      setContactsLoading(false);
    }
  };

  const markBusy = (id: string) => setActionIds(s => new Set(s).add(id));
  const unmarkBusy = (id: string) =>
    setActionIds(s => { const n = new Set(s); n.delete(id); return n; });

  const sendRequest = async (userId: string, fromContacts = false) => {
    haptics.light();
    markBusy(userId);
    try {
      await friendsService.sendRequest(userId);
      if (fromContacts) setContactMatches(prev => prev.filter(u => u._id !== userId));
      else setSearchResults(prev => prev.filter(u => u._id !== userId));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(userId); }
  };

  const accept = async (req: FriendRequest) => {
    haptics.success();
    markBusy(req._id);
    try {
      await friendsService.accept(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
      setFriends(prev => [req.sender, ...prev]);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const reject = async (req: FriendRequest) => {
    haptics.light();
    markBusy(req._id);
    try {
      await friendsService.reject(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const removeFriend = (friendId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
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
    haptics.light();
    setCodeLoading(true); setCodeResult('');
    try {
      await friendsService.sendRequest(normalized);
      setCodeResult('sent'); setCodeInput('');
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setCodeResult('notfound');
      } else {
        Alert.alert('Error', msg || 'Could not send friend request.');
      }
    } finally { setCodeLoading(false); }
  };

  const handleDirectAdd = async () => {
    if (!currentUser) { Alert.alert('Sign In Required'); return; }
    const val = directInput.trim();
    if (!val) return;
    haptics.light();
    setDirectLoading(true); setDirectResult(''); setDirectMatches([]);
    try {
      const data = await friendsService.search(val);
      if (data.users.length === 0) { setDirectResult('notfound'); return; }
      if (data.users.length > 1) { setDirectMatches(data.users); setDirectResult('multiple'); return; }
      await friendsService.sendRequest(data.users[0]._id);
      setDirectResult('sent'); setDirectInput('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send friend request.');
    } finally { setDirectLoading(false); }
  };

  const handleDirectAddToUser = async (userId: string) => {
    haptics.light();
    try {
      await friendsService.sendRequest(userId);
      setDirectMatches(prev => prev.filter(u => u._id !== userId));
      if (directMatches.length <= 1) { setDirectResult('sent'); setDirectInput(''); }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send friend request.');
    }
  };

  const closeModal = () => {
    setShareModalVisible(false);
    setDirectInput(''); setDirectResult(''); setDirectMatches([]);
    setCodeInput(''); setCodeResult('');
  };

  const inviteLink = `fincoord://invite?ref=${currentUser?.id}`;
  const inviteText = `Hey! I'm using FinCoord to track shared expenses. Add me: ${inviteLink}`;
  const shareGeneric = () => Share.share({ message: inviteText, title: 'Join me on FinCoord' });
  const shareWhatsApp = () =>
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteText)}`).catch(() =>
      Alert.alert('WhatsApp not installed'),
    );
  const shareSMS = () =>
    Linking.openURL(`sms:?body=${encodeURIComponent(inviteText)}`).catch(() => {});

  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>Sign in to use Friends.</Text>
      </View>
    );
  }

  const localOwed = Object.values(localDirectBalances).reduce((sum, b) => (b > 0 ? sum + b : sum), 0);
  const localOwe = Object.values(localDirectBalances).reduce((sum, b) => (b < 0 ? sum + Math.abs(b) : sum), 0);
  const totalOwed = (balanceSummary?.totalOwedToYou ?? 0) + localOwed;
  const totalOwe = (balanceSummary?.totalYouOwe ?? 0) + localOwe;
  const net = totalOwed - totalOwe;
  const summaryColor = net > 0 ? theme.primary : net < 0 ? theme.error : theme.textSecondary;
  const hasAnyPeople = friends.length > 0 || Object.keys(localDirectBalances).length > 0;

  type ListItem =
    | { type: 'balance'; data: FriendBalance }
    | { type: 'settled'; data: FriendUser };

  const balancedIds = new Set(balanceSummary?.friends.map(f => f.friendId) ?? []);
  const apiFriendIds = new Set(friends.map(f => f._id));

  const promotedFromSettled: ListItem[] = [];
  const trulySettledFriends: FriendUser[] = [];
  for (const f of friends.filter(fr => !balancedIds.has(fr._id))) {
    const localBal = localDirectBalances[f._id] ?? 0;
    if (Math.abs(localBal) > 0.005) {
      promotedFromSettled.push({
        type: 'balance' as const,
        data: { friendId: f._id, name: f.name, email: f.email, profilePic: f.profilePic, netBalance: 0, breakdown: [] } as FriendBalance,
      });
    } else {
      trulySettledFriends.push(f);
    }
  }

  const localOnlyEntries: ListItem[] = Object.entries(localDirectBalances)
    .filter(([id, bal]) => !balancedIds.has(id) && !apiFriendIds.has(id) && Math.abs(bal) > 0.005)
    .map(([id]) => ({
      type: 'balance' as const,
      data: {
        friendId: id,
        name: localFriendNames[id] ?? 'Friend',
        email: '',
        profilePic: undefined,
        netBalance: 0,
        breakdown: [],
      } as FriendBalance,
    }));

  const listData: ListItem[] = [
    ...(balanceSummary?.friends ?? []).map(f => ({ type: 'balance' as const, data: f })),
    ...promotedFromSettled,
    ...localOnlyEntries,
    ...trulySettledFriends.map(f => ({ type: 'settled' as const, data: f })),
  ];
  const displayedList = showSettled ? listData : listData.filter(item => item.type === 'balance');
  const settledCount = trulySettledFriends.length;

  const renderSearchRow = (item: FriendUser, fromContacts = false) => (
    <View style={[styles.row, { backgroundColor: theme.surface }]} key={item._id}>
      <AppAvatar user={item} size={48} />
      <View style={styles.rowInfo}>
        <Text variant="bodyLarge" style={{ color: theme.text }}>{item.name}</Text>
        <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{item.email}</Text>
      </View>
      <Button
        mode="contained" compact
        loading={actionIds.has(item._id)}
        disabled={actionIds.has(item._id)}
        onPress={() => sendRequest(item._id, fromContacts)}
        style={{ backgroundColor: theme.primary }}
      >
        Add
      </Button>
    </View>
  );

  const renderBalanceFriend = ({ item }: { item: FriendBalance }) => {
    const effectiveBalance = item.netBalance + (localDirectBalances[item.friendId] ?? 0);
    const owedToMe = effectiveBalance > 0;
    const amountColor = owedToMe ? theme.primary : theme.error;
    const label = owedToMe ? 'owes you' : 'you owe';
    const directBalance = localDirectBalances[item.friendId] ?? 0;
    const shown = item.breakdown.slice(0, 2);
    const extra = item.breakdown.length - 2;

    return (
      <TouchableRipple
        onPress={() => navigation.navigate('FriendDetail', {
          friendId: item.friendId,
          friendName: item.name,
          friendProfilePic: item.profilePic,
          netBalance: effectiveBalance,
          breakdown: item.breakdown,
        })}
        onLongPress={() => removeFriend(item.friendId)}
        rippleColor="rgba(0,0,0,0.05)"
      >
        <View style={[styles.balanceRow, { backgroundColor: theme.surface }]}>
          <View style={styles.avatarCol}>
            <PieAvatar
              user={{ _id: item.friendId, name: item.name, profilePic: item.profilePic }}
              size={48}
            />
          </View>
          <View style={styles.balanceInfo}>
            <View style={styles.balanceTopRow}>
              <Text variant="bodyLarge" style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.amountCol}>
                <Text variant="labelSmall" style={[styles.owesLabel, { color: amountColor }]}>{label}</Text>
                <Text variant="titleMedium" style={[styles.balanceAmount, { color: amountColor }]}>
                  {formatAmount(Math.abs(effectiveBalance), symbol)}
                </Text>
              </View>
            </View>
            {Math.abs(directBalance) > 0.005 && (
              <Text variant="bodySmall" style={[styles.breakdownLine, { color: theme.textSecondary }]} numberOfLines={1}>
                {directBalance > 0
                  ? `${item.name.split(' ')[0]} owes you `
                  : `You owe ${item.name.split(' ')[0]} `}
                <Text variant="labelMedium" style={{ color: amountColor }}>
                  {formatAmount(Math.abs(directBalance), symbol)}
                </Text>
                {' in non-group expenses'}
              </Text>
            )}
            {shown.map((b, i) => {
              const owed = b.direction === 'owes_you';
              const lineColor = owed ? theme.primary : theme.warning;
              return (
                <Text key={i} variant="bodySmall" style={[styles.breakdownLine, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.name.split(' ')[0]} {item.name.split(' ').length > 1 ? `${(item.name.split(' ')[1]?.[0] ?? '').toUpperCase()}.` : ''} {' '}
                  {owed ? 'owes you ' : 'you owe '}
                  <Text variant="labelMedium" style={{ color: lineColor }}>
                    {formatAmount(b.amount, symbol)}
                  </Text>
                  {` in "${b.groupName}"`}
                </Text>
              );
            })}
            {extra > 0 && (
              <Text variant="bodySmall" style={[styles.breakdownLine, { color: theme.textSecondary }]}>
                Plus {extra} more balance{extra > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      </TouchableRipple>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#121212' ? 'light-content' : 'dark-content'} />

      {/* ═══════════════════════════════════════════════════════════════
          HEADER — fixed, with safe-area padding
         ═══════════════════════════════════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background }]}>
        {searchVisible ? (
          <TextInput
            mode="flat"
            placeholder="Search by name, email or phone…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            left={
              <TextInput.Icon
                icon="arrow-left"
                onPress={() => { setSearchVisible(false); setQuery(''); }}
              />
            }
            right={query ? <TextInput.Icon icon="close" onPress={() => setQuery('')} /> : undefined}
            style={[styles.inlineSearch, { backgroundColor: theme.background }]}
            dense
          />
        ) : (
          <>
            <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.text }]}>Friends</Text>
            <View style={styles.headerActions}>
              {requests.length > 0 && (
                <TouchableRipple
                  onPress={() => setView(view === 'requests' ? 'balances' : 'requests')}
                  style={[
                    styles.requestsBadge,
                    {
                      backgroundColor: view === 'requests' ? theme.primary : 'transparent',
                      borderColor: theme.primary,
                    },
                  ]}
                  rippleColor="rgba(0,0,0,0.1)"
                >
                  <Text
                    variant="labelSmall"
                    style={{
                      color: view === 'requests' ? '#FFF' : theme.primary,
                    }}
                  >
                    {requests.length}
                  </Text>
                </TouchableRipple>
              )}
              <IconButton
                icon="magnify"
                size={24}
                iconColor={theme.text}
                onPress={() => setSearchVisible(true)}
                style={styles.headerIconBtn}
              />
              <IconButton
                icon="account-plus-outline"
                size={24}
                iconColor={theme.primary}
                onPress={() => setShareModalVisible(true)}
                style={styles.headerIconBtn}
              />
            </View>
          </>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════════════════════ */}

      {searchVisible ? (
        <View style={{ flex: 1 }}>
          {query.trim().length < 2 ? (
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>Type at least 2 characters to search.</Text>
          ) : searching ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
          ) : searchResults.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>No users found.</Text>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={u => u._id}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => renderSearchRow(item, false)}
            />
          )}
        </View>

      ) : view === 'requests' ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.sectionBar, { backgroundColor: theme.surface }]}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Friend Requests</Text>
            <Button mode="text" onPress={() => setView('balances')}>
              Done
            </Button>
          </View>
          <Divider />
          <FlatList
            data={[
              ...requests.map(r => ({ kind: 'received' as const, item: r })),
              ...sentRequests.map(r => ({ kind: 'sent' as const, item: r })),
            ]}
            keyExtractor={x => x.item._id + x.kind}
            ItemSeparatorComponent={() => <Divider />}
            ListEmptyComponent={<Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>No pending requests.</Text>}
            ListHeaderComponent={requests.length > 0 ? (
              <Text variant="labelSmall" style={[styles.reqSectionHeader, { color: theme.textSecondary }]}>RECEIVED</Text>
            ) : null}
            renderItem={({ item: x, index }) => {
              const prevKind = index > 0
                ? ([...requests.map(r => ({ kind: 'received' as const, item: r })), ...sentRequests.map(r => ({ kind: 'sent' as const, item: r }))])[index - 1]?.kind
                : null;
              const showSentHeader = x.kind === 'sent' && prevKind !== 'sent';

              return (
                <>
                  {showSentHeader && (
                    <Text variant="labelSmall" style={[styles.reqSectionHeader, { color: theme.textSecondary }]}>SENT</Text>
                  )}
                  <View style={[styles.row, { backgroundColor: theme.surface }]}>
                    <AppAvatar user={x.kind === 'received' ? x.item.sender : x.item.receiver} size={48} />
                    <View style={styles.rowInfo}>
                      <Text variant="bodyLarge" style={{ color: theme.text }}>
                        {x.kind === 'received' ? x.item.sender.name : x.item.receiver.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                        {x.kind === 'received' ? x.item.sender.email : x.item.receiver.email}
                      </Text>
                    </View>
                    <View style={styles.reqActions}>
                      {x.kind === 'received' ? (
                        <>
                          <Button
                            mode="contained" compact
                            loading={actionIds.has(x.item._id)}
                            disabled={actionIds.has(x.item._id)}
                            onPress={() => accept(x.item)}
                            style={{ backgroundColor: theme.primary }}
                          >
                            Accept
                          </Button>
                          <Button mode="text" compact textColor={theme.error} onPress={() => reject(x.item)}>
                            Decline
                          </Button>
                        </>
                      ) : (
                        <>
                          <Text variant="labelSmall" style={{ color: theme.textSecondary, marginBottom: 4 }}>Pending</Text>
                          <Button
                            mode="text" compact textColor={theme.error}
                            onPress={() => {
                              friendsService.remove(x.item.receiver._id).catch(() => {});
                              setSentRequests(prev => prev.filter(r => r._id !== x.item._id));
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </View>
                  </View>
                </>
              );
            }}
          />
        </View>

      ) : (
        /* ── Balances view (default) ── */
        <>
          {apiError && (
            <Banner
              visible
              actions={[{ label: 'Retry', onPress: () => load() }]}
              icon="wifi-off"
            >
              {apiError}
            </Banner>
          )}

          {/* Summary card */}
          {!loading && hasAnyPeople && (
            <Surface style={styles.summaryCard} elevation={2}>
              <View style={styles.summaryInner}>
                <View style={styles.summaryBlock}>
                  <Text variant="labelSmall" style={[styles.summaryLabel, { color: theme.textSecondary }]}>You are owed</Text>
                  <Text variant="titleLarge" style={[styles.summaryValue, { color: theme.primary }]}>
                    {formatAmount(totalOwed, symbol)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={styles.summaryBlock}>
                  <Text variant="labelSmall" style={[styles.summaryLabel, { color: theme.textSecondary }]}>You owe</Text>
                  <Text variant="titleLarge" style={[styles.summaryValue, { color: theme.error }]}>
                    {formatAmount(totalOwe, symbol)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={styles.summaryBlock}>
                  <Text variant="labelSmall" style={[styles.summaryLabel, { color: theme.textSecondary }]}>Net</Text>
                  <Text variant="titleLarge" style={[styles.summaryValue, { color: summaryColor }]}>
                    {net >= 0 ? '+' : '-'}{formatAmount(Math.abs(net), symbol)}
                  </Text>
                </View>
              </View>
            </Surface>
          )}

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={displayedList}
              keyExtractor={item =>
                item.type === 'balance' ? item.data.friendId : item.data._id
              }
              ItemSeparatorComponent={() => <Divider style={{ marginLeft: 76 }} />}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 + insets.bottom }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load(true)}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
              renderItem={({ item }) => {
                if (item.type === 'balance') return renderBalanceFriend({ item: item.data });
                return (
                  <TouchableRipple
                    onPress={() => navigation.navigate('FriendDetail', {
                      friendId: item.data._id,
                      friendName: item.data.name,
                      friendProfilePic: item.data.profilePic,
                      netBalance: 0,
                      breakdown: [],
                    })}
                    onLongPress={() => removeFriend(item.data._id)}
                    rippleColor="rgba(0,0,0,0.05)"
                  >
                    <View style={[styles.balanceRow, { backgroundColor: theme.surface }]}>
                      <AppAvatar user={item.data} size={48} />
                      <View style={styles.balanceInfo}>
                        <View style={styles.balanceTopRow}>
                          <Text variant="bodyLarge" style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
                            {item.data.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.textSecondary }}>settled up</Text>
                        </View>
                        <Text variant="bodySmall" style={[styles.breakdownLine, { color: theme.textSecondary }]}>
                          {item.data.email}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                );
              }}
              ListFooterComponent={() => (
                settledCount > 0 ? (
                  <View style={styles.settledToggle}>
                    {!showSettled ? (
                      <>
                        <Text variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 10 }}>
                          Hiding {settledCount} settled-up friend{settledCount > 1 ? 's' : ''}
                        </Text>
                        <Button
                          mode="outlined"
                          onPress={() => setShowSettled(true)}
                          style={[styles.showSettledBtn, { borderColor: theme.primary }]}
                          textColor={theme.primary}
                        >
                          Show {settledCount} settled-up friend{settledCount > 1 ? 's' : ''}
                        </Button>
                      </>
                    ) : (
                      <Button
                        mode="outlined"
                        onPress={() => setShowSettled(false)}
                        style={[styles.showSettledBtn, { borderColor: theme.disabled }]}
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

      {/* ── FABs ── */}
      <View style={[styles.fabContainer, { bottom: Math.max(24, insets.bottom + 8) }]} pointerEvents="box-none">
        <FAB
          icon="camera-outline"
          variant="secondary"
          onPress={() => navigation.navigate('QRScanner')}
        />
        <FAB
          icon="receipt-text-outline"
          onPress={() => navigation.navigate('AddExpenseModal')}
        />
      </View>

      {/* ── Add Friend modal ── */}
      <Portal>
        <Modal
          visible={shareModalVisible}
          onDismiss={closeModal}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>
            Add a Friend
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Button
              mode="contained" icon="qrcode-scan"
              onPress={() => { closeModal(); navigation.navigate('QRScanner'); }}
              style={[styles.shareBtn, { backgroundColor: theme.primary }]}
              contentStyle={styles.shareBtnContent}
            >
              Scan Friend's QR Code
            </Button>

            <Divider style={styles.modalDivider} />

            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>
              BY FRIEND CODE
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Paste or type friend code…"
              value={codeInput}
              onChangeText={t => { setCodeInput(t); setCodeResult(''); }}
              autoCapitalize="none" autoCorrect={false}
              left={<TextInput.Icon icon="pound" />}
              style={styles.directInput} dense
            />
            {codeResult === 'invalid' && (
              <Text variant="bodySmall" style={[styles.inputError, { color: theme.error }]}>Invalid code — should be 24 hex characters.</Text>
            )}
            {codeResult === 'notfound' && (
              <Text variant="bodySmall" style={[styles.inputError, { color: theme.error }]}>No user found with that code.</Text>
            )}
            {codeResult === 'sent' && (
              <Text variant="labelMedium" style={[styles.inputSuccess, { color: theme.primary }]}>
                Friend request sent!
              </Text>
            )}
            <Button
              mode="contained" loading={codeLoading}
              disabled={codeLoading || !codeInput.trim() || codeResult === 'sent'}
              onPress={handleAddByCode}
              style={[styles.shareBtn, { backgroundColor: theme.primary }]}
              contentStyle={styles.shareBtnContent}
            >
              Add by Code
            </Button>

            <Divider style={styles.modalDivider} />

            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>
              BY EMAIL OR PHONE
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Enter email or phone number"
              value={directInput}
              onChangeText={t => { setDirectInput(t); setDirectResult(''); setDirectMatches([]); }}
              keyboardType="default" autoCapitalize="none"
              left={<TextInput.Icon icon="account-search-outline" />}
              style={styles.directInput} dense
            />
            {directResult === 'notfound' && (
              <Text variant="bodySmall" style={[styles.inputError, { color: theme.error }]}>No user found with that email or phone.</Text>
            )}
            {directResult === 'sent' && (
              <Text variant="labelMedium" style={[styles.inputSuccess, { color: theme.primary }]}>
                Friend request sent!
              </Text>
            )}
            {directResult === 'multiple' && directMatches.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text variant="bodySmall" style={[styles.inputError, { color: theme.textSecondary }]}>
                  Multiple matches — pick one:
                </Text>
                {directMatches.map(u => (
                  <View key={u._id} style={styles.multiRow}>
                    <View style={styles.multiInfo}>
                      <Text variant="bodyMedium" style={{ color: theme.text }}>
                        {u.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{u.email}</Text>
                    </View>
                    <Button
                      mode="contained" compact
                      onPress={() => handleDirectAddToUser(u._id)}
                      style={{ backgroundColor: theme.primary }}
                    >
                      Add
                    </Button>
                  </View>
                ))}
              </View>
            )}
            {directResult !== 'multiple' && (
              <Button
                mode="contained" loading={directLoading}
                disabled={directLoading || !directInput.trim() || directResult === 'sent'}
                onPress={handleDirectAdd}
                style={[styles.shareBtn, { backgroundColor: theme.primary }]}
                contentStyle={styles.shareBtnContent}
              >
                Send Friend Request
              </Button>
            )}

            <Divider style={styles.modalDivider} />

            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>
              FROM CONTACTS
            </Text>
            {!contactsLoaded ? (
              <Button
                mode="outlined" icon="contacts-outline"
                loading={contactsLoading}
                onPress={loadContacts}
                style={styles.shareBtn} contentStyle={styles.shareBtnContent}
              >
                {contactsPermission === 'denied' ? 'Permission Denied' : 'Find from Contacts'}
              </Button>
            ) : contactMatches.length === 0 ? (
              <Text variant="bodySmall" style={[styles.inputError, { color: theme.textSecondary }]}>
                None of your contacts are on FinCoord yet.
              </Text>
            ) : (
              <>
                <Text variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: 8 }}>
                  {contactMatches.length} contact{contactMatches.length > 1 ? 's' : ''} on FinCoord
                </Text>
                {contactMatches.map(u => renderSearchRow(u, true))}
              </>
            )}

            <Divider style={styles.modalDivider} />

            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>
              INVITE VIA LINK
            </Text>
            <Text variant="bodySmall" style={[styles.modalLink, { color: theme.textSecondary }]}>{inviteLink}</Text>
            <Button icon="whatsapp" mode="contained" onPress={shareWhatsApp}
              style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
              contentStyle={styles.shareBtnContent}>
              Share via WhatsApp
            </Button>
            <Button icon="message-text-outline" mode="contained" onPress={shareSMS}
              style={[styles.shareBtn, { backgroundColor: '#007AFF' }]}
              contentStyle={styles.shareBtnContent}>
              Share via SMS
            </Button>
            <Button icon="share-variant" mode="outlined" onPress={shareGeneric}
              style={styles.shareBtn} contentStyle={styles.shareBtnContent}>
              More options…
            </Button>
            <Button mode="text" onPress={closeModal}>Cancel</Button>

          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  headerTitle: {},
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { padding: 10 },
  requestsBadge: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 2,
  },
  inlineSearch: { flex: 1, height: 44 },

  // Summary card
  summaryCard: {
    marginHorizontal: 16, marginVertical: 12,
    borderRadius: 16,
  },
  summaryInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18,
  },
  summaryBlock: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  summaryLabel: { marginBottom: 4 },
  summaryValue: {},

  // Section bar (requests header)
  sectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: {},

  // Balance friend row
  balanceRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  avatarCol: {
    width: 48,
    alignItems: 'center',
  },
  balanceInfo: { flex: 1 },
  balanceTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  friendName: { flex: 1, marginRight: 8 },
  amountCol: { alignItems: 'flex-end' },
  owesLabel: { marginBottom: 1 },
  balanceAmount: {},
  breakdownLine: { marginTop: 2, lineHeight: 18 },

  // Generic list row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  rowInfo: { flex: 1 },
  reqActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  reqSectionHeader: {
    letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  emptyText: { textAlign: 'center', padding: 24, lineHeight: 22 },

  // FABs
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },

  // Modal
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 20, maxHeight: '88%' },
  modalTitle: { marginBottom: 12 },
  modalSectionLabel: { letterSpacing: 0.8, marginBottom: 8 },
  modalDivider: { marginVertical: 16 },
  modalLink: { marginBottom: 12 },
  shareBtn: { marginBottom: 10, borderRadius: 10 },
  shareBtnContent: { paddingVertical: 4 },
  directInput: { marginBottom: 6 },
  inputError: { marginBottom: 6 },
  inputSuccess: { marginBottom: 8 },
  multiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  multiInfo: { flex: 1 },

  // Settled toggle
  settledToggle: {
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24,
  },
  showSettledBtn: {
    borderWidth: 1.5, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 9,
  },
});
