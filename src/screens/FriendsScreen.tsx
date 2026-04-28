import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Image, Share, Linking, Alert,
  PermissionsAndroid, Platform, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text, TextInput, Button, Divider, ActivityIndicator,
  TouchableRipple, Portal, Modal, Icon, Banner,
} from 'react-native-paper';
import Contacts from 'react-native-contacts';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import {
  friendsService, FriendUser, FriendRequest, FriendBalance, BalanceSummary,
} from '../services/friendsService';
import { normalizeCode } from './MyQRCodeScreen';

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

function Avatar({
  user,
  size = 48,
}: {
  user: { _id?: string; name: string; profilePic?: string };
  size?: number;
}) {
  const id = user._id || user.name;
  if (user.profilePic) {
    return (
      <Image
        source={{ uri: user.profilePic }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor(id),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: size * 0.4 }}>
        {(user.name?.[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
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
      <Image
        source={{ uri: user.profilePic }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
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
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: size * 0.35, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
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

  // Compute balances from local "direct" (non-group) expenses so they
  // reflect immediately even before API sync.
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
    return result; // positive = they owe me, negative = I owe them
  }, [localExpenses, myId]);

  // Build id → name map from participantNames stored on direct expenses
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

  // Re-fetch every time screen comes into focus (e.g. after adding expense)
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
    markBusy(userId);
    try {
      await friendsService.sendRequest(userId);
      if (fromContacts) setContactMatches(prev => prev.filter(u => u._id !== userId));
      else setSearchResults(prev => prev.filter(u => u._id !== userId));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(userId); }
  };

  const accept = async (req: FriendRequest) => {
    markBusy(req._id);
    try {
      await friendsService.accept(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
      setFriends(prev => [req.sender, ...prev]);
      load(); // refresh balances
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(req._id); }
  };

  const reject = async (req: FriendRequest) => {
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
        <Text style={{ color: '#888' }}>Sign in to use Friends.</Text>
      </View>
    );
  }

  // Net balance summary
  const totalOwed = balanceSummary?.totalOwedToYou ?? 0;
  const totalOwe = balanceSummary?.totalYouOwe ?? 0;
  const net = totalOwed - totalOwe;
  const summaryColor = net > 0 ? theme.primary : net < 0 ? '#FF6B6B' : '#888';

  // Merge balanced + settled friends into one list
  type ListItem =
    | { type: 'balance'; data: FriendBalance }
    | { type: 'settled'; data: FriendUser };

  const balancedIds = new Set(balanceSummary?.friends.map(f => f.friendId) ?? []);
  const apiFriendIds = new Set(friends.map(f => f._id));

  // Friends in API list but no shared group expenses — split into those with/without direct balance
  const promotedFromSettled: ListItem[] = [];
  const trulySettledFriends: FriendUser[] = [];
  for (const f of friends.filter(fr => !balancedIds.has(fr._id))) {
    const localBal = localDirectBalances[f._id] ?? 0;
    if (Math.abs(localBal) > 0.005) {
      promotedFromSettled.push({
        type: 'balance' as const,
        data: { friendId: f._id, name: f.name, email: f.email, profilePic: f.profilePic, netBalance: localBal, breakdown: [] } as FriendBalance,
      });
    } else {
      trulySettledFriends.push(f);
    }
  }

  // Build synthetic balance entries for friends only known locally (not in API friends list at all)
  const localOnlyEntries: ListItem[] = Object.entries(localDirectBalances)
    .filter(([id, bal]) => !balancedIds.has(id) && !apiFriendIds.has(id) && Math.abs(bal) > 0.005)
    .map(([id, bal]) => ({
      type: 'balance' as const,
      data: {
        friendId: id,
        name: localFriendNames[id] ?? 'Friend',
        email: '',
        profilePic: undefined,
        netBalance: bal,
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
      <Avatar user={item} />
      <View style={styles.rowInfo}>
        <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
        <Text variant="bodySmall" style={{ color: '#888' }}>{item.email}</Text>
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
    // Merge API balance with locally-stored direct expenses
    const effectiveBalance = item.netBalance + (localDirectBalances[item.friendId] ?? 0);
    const owedToMe = effectiveBalance > 0;
    const amountColor = owedToMe ? theme.primary : '#FF6B6B';
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
              size={44}
            />
          </View>
          <View style={styles.balanceInfo}>
            <View style={styles.balanceTopRow}>
              <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.amountCol}>
                <Text style={[styles.owesLabel, { color: amountColor }]}>{label}</Text>
                <Text style={[styles.balanceAmount, { color: amountColor }]}>
                  {formatAmount(Math.abs(effectiveBalance), symbol)}
                </Text>
              </View>
            </View>
            {/* Non-group (direct) expenses */}
            {Math.abs(directBalance) > 0.005 && (
              <Text style={[styles.breakdownLine, { color: '#888' }]} numberOfLines={1}>
                {item.name.split(' ')[0]} owes you{' '}
                <Text style={{ color: amountColor, fontWeight: '600' }}>
                  {formatAmount(Math.abs(directBalance), symbol)}
                </Text>
                {' in non-group expenses'}
              </Text>
            )}
            {/* Group breakdown */}
            {shown.map((b, i) => {
              const owed = b.direction === 'owes_you';
              const lineColor = owed ? theme.primary : '#E8673A';
              return (
                <Text key={i} style={[styles.breakdownLine, { color: '#888' }]} numberOfLines={1}>
                  {item.name.split(' ')[0]} {item.name.split(' ').length > 1 ? `${(item.name.split(' ')[1]?.[0] ?? '').toUpperCase()}.` : ''} {' '}
                  {owed ? 'owes you ' : 'you owe '}
                  <Text style={{ color: lineColor, fontWeight: '600' }}>
                    {formatAmount(b.amount, symbol)}
                  </Text>
                  {` in "${b.groupName}"`}
                </Text>
              );
            })}
            {extra > 0 && (
              <Text style={[styles.breakdownLine, { color: '#999' }]}>
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

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
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
            <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerIconBtn}>
              <Icon source="magnify" size={26} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
            {requests.length > 0 && (
              <TouchableOpacity
                onPress={() => setView(view === 'requests' ? 'balances' : 'requests')}
                style={[
                  styles.requestsBadge,
                  {
                    backgroundColor: view === 'requests' ? theme.primary : 'transparent',
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: view === 'requests' ? '#FFF' : theme.primary,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {requests.length} pending
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShareModalVisible(true)}>
              <Text style={[styles.addFriendsBtn, { color: theme.primary }]}>Add friends</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Search results ── */}
      {searchVisible ? (
        <View style={{ flex: 1 }}>
          {query.trim().length < 2 ? (
            <Text style={styles.emptyText}>Type at least 2 characters to search.</Text>
          ) : searching ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
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
        /* ── Requests view ── */
        <View style={{ flex: 1 }}>
          <View style={[styles.sectionBar, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Friend Requests</Text>
            <TouchableOpacity onPress={() => setView('balances')}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <Divider />
          <FlatList
            data={[
              ...requests.map(r => ({ kind: 'received' as const, item: r })),
              ...sentRequests.map(r => ({ kind: 'sent' as const, item: r })),
            ]}
            keyExtractor={x => x.item._id + x.kind}
            ItemSeparatorComponent={() => <Divider />}
            ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
            ListHeaderComponent={requests.length > 0 ? (
              <Text style={[styles.reqSectionHeader, { color: '#888' }]}>RECEIVED</Text>
            ) : null}
            renderItem={({ item: x, index }) => {
              const prevKind = index > 0
                ? ([...requests.map(r => ({ kind: 'received' as const, item: r })), ...sentRequests.map(r => ({ kind: 'sent' as const, item: r }))])[index - 1]?.kind
                : null;
              const showSentHeader = x.kind === 'sent' && prevKind !== 'sent';

              return (
                <>
                  {showSentHeader && (
                    <Text style={[styles.reqSectionHeader, { color: '#888' }]}>SENT</Text>
                  )}
                  <View style={[styles.row, { backgroundColor: theme.surface }]}>
                    <Avatar user={x.kind === 'received' ? x.item.sender : x.item.receiver} />
                    <View style={styles.rowInfo}>
                      <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                        {x.kind === 'received' ? x.item.sender.name : x.item.receiver.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#888' }}>
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
                          <Button mode="text" compact textColor="#FF3B30" onPress={() => reject(x.item)}>
                            Decline
                          </Button>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Pending</Text>
                          <Button
                            mode="text" compact textColor="#FF3B30"
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
          {/* API error banner */}
          {apiError && (
            <Banner
              visible
              actions={[{ label: 'Retry', onPress: () => load() }]}
              icon="wifi-off"
            >
              {apiError}
            </Banner>
          )}

          {/* Summary bar */}
          {!loading && friends.length > 0 && (
            <View style={[styles.summaryBar, { backgroundColor: theme.surface }]}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {net === 0 ? (
                  <Text style={{ color: '#888' }}>Overall, you are settled up</Text>
                ) : net > 0 ? (
                  <>
                    <Text>Overall, you are owed </Text>
                    <Text style={{ color: summaryColor, fontWeight: '700' }}>
                      {formatAmount(net, symbol)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text>Overall, you owe </Text>
                    <Text style={{ color: summaryColor, fontWeight: '700' }}>
                      {formatAmount(net, symbol)}
                    </Text>
                  </>
                )}
              </Text>
              <Icon source="tune-variant" size={22} color="#999" />
            </View>
          )}
          <Divider />

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={displayedList}
              keyExtractor={item =>
                item.type === 'balance' ? item.data.friendId : item.data._id
              }
              ItemSeparatorComponent={() => (
                <View style={styles.connectorWrap}>
                  <View style={styles.connectorLine} />
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
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
                // Settled friend row
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
                      <Avatar user={item.data} size={48} />
                      <View style={styles.balanceInfo}>
                        <View style={styles.balanceTopRow}>
                          <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
                            {item.data.name}
                          </Text>
                          <Text style={{ color: '#888', fontSize: 13 }}>settled up</Text>
                        </View>
                        <Text style={[styles.breakdownLine, { color: '#aaa' }]}>
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
                        <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                          Hiding {settledCount} settled-up friend{settledCount > 1 ? 's' : ''} over 7 days ago
                        </Text>
                        <TouchableOpacity
                          style={[styles.showSettledBtn, { borderColor: theme.primary }]}
                          onPress={() => setShowSettled(true)}
                        >
                          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>
                            Show {settledCount} settled-up friend{settledCount > 1 ? 's' : ''}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.showSettledBtn, { borderColor: '#CCC' }]}
                        onPress={() => setShowSettled(false)}
                      >
                        <Text style={{ color: '#888', fontWeight: '600', fontSize: 14 }}>
                          Hide settled friends
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              )}
              ListEmptyComponent={
                <View style={[styles.centered, { paddingTop: 60 }]}>
                  <Icon source="account-group-outline" size={64} color="#ccc" />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>
                    No friends yet.{'\n'}Tap "Add friends" to get started.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── FABs ── */}
      <View style={[styles.fabContainer, { bottom: Math.max(24, insets.bottom + 8) }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.scanFab, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('QRScanner')}
          activeOpacity={0.8}
        >
          <Icon source="camera-outline" size={20} color={theme.text} />
          <Text style={{ color: theme.text, marginLeft: 6, fontWeight: '600', fontSize: 14 }}>
            Scan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addExpenseFab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddExpenseModal')}
          activeOpacity={0.85}
        >
          <Icon source="receipt-text-outline" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', marginLeft: 8, fontWeight: '700', fontSize: 15 }}>
            Add expense
          </Text>
        </TouchableOpacity>
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

            {/* QR scan */}
            <Button
              mode="contained" icon="qrcode-scan"
              onPress={() => { closeModal(); navigation.navigate('QRScanner'); }}
              style={[styles.shareBtn, { backgroundColor: theme.primary }]}
              contentStyle={styles.shareBtnContent}
            >
              Scan Friend's QR Code
            </Button>

            <Divider style={styles.modalDivider} />

            {/* Friend code */}
            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: '#888' }]}>
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
              <Text style={styles.inputError}>Invalid code — should be 24 hex characters.</Text>
            )}
            {codeResult === 'notfound' && (
              <Text style={styles.inputError}>No user found with that code.</Text>
            )}
            {codeResult === 'sent' && (
              <Text style={[styles.inputSuccess, { color: theme.primary }]}>
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

            {/* Email / phone */}
            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: '#888' }]}>
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
              <Text style={styles.inputError}>No user found with that email or phone.</Text>
            )}
            {directResult === 'sent' && (
              <Text style={[styles.inputSuccess, { color: theme.primary }]}>
                Friend request sent!
              </Text>
            )}
            {directResult === 'multiple' && directMatches.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={[styles.inputError, { color: '#888' }]}>
                  Multiple matches — pick one:
                </Text>
                {directMatches.map(u => (
                  <View key={u._id} style={styles.multiRow}>
                    <View style={styles.multiInfo}>
                      <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
                        {u.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: '#888' }}>{u.email}</Text>
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

            {/* From contacts */}
            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: '#888' }]}>
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
              <Text style={[styles.inputError, { color: '#888' }]}>
                None of your contacts are on FinCoord yet.
              </Text>
            ) : (
              <>
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                  {contactMatches.length} contact{contactMatches.length > 1 ? 's' : ''} on FinCoord
                </Text>
                {contactMatches.map(u => renderSearchRow(u, true))}
              </>
            )}

            <Divider style={styles.modalDivider} />

            {/* Invite link */}
            <Text variant="labelMedium" style={[styles.modalSectionLabel, { color: '#888' }]}>
              INVITE VIA LINK
            </Text>
            <Text variant="bodySmall" style={styles.modalLink}>{inviteLink}</Text>
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
  centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  headerIconBtn: { padding: 4 },
  headerSpacer: { flex: 1 },
  requestsBadge: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  addFriendsBtn: { fontSize: 16, fontWeight: '600' },
  inlineSearch: { flex: 1, height: 44 },

  // Summary bar
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  summaryText: { flex: 1, fontSize: 15 },

  // Section bar (requests header)
  sectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },

  // Balance friend row
  balanceRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  avatarCol: {
    width: 44,
    alignItems: 'center',
  },
  connectorWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  connectorLine: {
    width: 44,
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
    marginLeft: 21,
    height: 14,
  },
  balanceInfo: { flex: 1 },
  balanceTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  friendName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  amountCol: { alignItems: 'flex-end' },
  owesLabel: { fontSize: 11, marginBottom: 1 },
  balanceAmount: { fontSize: 17, fontWeight: '700' },
  breakdownLine: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },

  // Generic list row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  rowInfo: { flex: 1 },
  reqActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  reqSectionHeader: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  emptyText: { color: '#999', textAlign: 'center', padding: 24, lineHeight: 22 },

  // FABs
  fabContainer: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  scanFab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  addExpenseFab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28,
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },

  // Modal
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 20, maxHeight: '88%' },
  modalTitle: { fontWeight: '600', marginBottom: 12 },
  modalSectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  modalDivider: { marginVertical: 16 },
  modalLink: { color: '#888', marginBottom: 12, fontSize: 11 },
  shareBtn: { marginBottom: 10, borderRadius: 10 },
  shareBtnContent: { paddingVertical: 4 },
  directInput: { marginBottom: 6 },
  inputError: { color: '#FF3B30', fontSize: 12, marginBottom: 6 },
  inputSuccess: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
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
