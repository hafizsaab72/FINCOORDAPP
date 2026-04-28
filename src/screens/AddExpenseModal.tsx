import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
  TextInput as RNTextInput, Alert, Platform, KeyboardAvoidingView,
  Modal as RNModal,
} from 'react-native';
import {
  Text, Icon, ActivityIndicator,
  TextInput as PaperTextInput, Button, Chip, Divider,
  SegmentedButtons, IconButton,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../services/api';
import { expensesService, groupsService } from '../services/groupsService';
import { DatePickerModal } from 'react-native-paper-dates';
import { friendsService, FriendUser } from '../services/friendsService';
import { getSymbol } from '../utils/currency';
import { SplitMethod } from '../types';
import { launchImageLibrary } from 'react-native-image-picker';

// ── Types ──────────────────────────────────────────────────────
type InternalView = 'main' | 'participants' | 'split_quick' | 'split_advanced';
type QuickSplit = 'you_paid_equal' | 'you_paid_full' | 'they_paid_equal' | 'they_paid_full';
type AdvSplitType = 'equal' | 'exact' | 'percentage';
interface Participant { id: string; name: string }

// ── Helpers ────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();

const avatarColor = (id: string) => {
  const palette = ['#E8673A', '#0F7A5B', '#5B5EA6', '#9B2335', '#3D7A60', '#BF4F74'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.codePointAt(i)! + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

const fmtAmt = (sym: string, v: number) =>
  `${sym}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Avatar ─────────────────────────────────────────────────────
function Av({ name, id, size = 40 }: { name: string; id: string; size?: number }) {
  return (
    <View style={[avStyle.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(id) }]}>
      <Text style={[avStyle.text, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
}
const avStyle = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFF', fontWeight: '700' },
});

// ══════════════════════════════════════════════════════════════
export default function AddExpenseModal({ navigation, route }: any) {
  const initialGroupId: string | undefined = route?.params?.groupId;
  const initialFriendId: string | undefined = route?.params?.friendId;
  const initialFriendName: string | undefined = route?.params?.friendName;
  const editExpense = route?.params?.editExpense ?? null;
  const isEditing = !!editExpense;

  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);
  const token = useStore(s => s.token);
  const homeCurrency = useStore(s => s.currency);
  const groups = useStore(s => s.groups);
  const addExpense = useStore(s => s.addExpense);
  const updateExpense = useStore(s => s.updateExpense);

  const myId = currentUser?.id ?? 'me';
  const myName = currentUser?.name ?? 'You';

  // ── View state ─────────────────────────────────────────────
  const [view, setView] = useState<InternalView>('main');

  // ── Form fields ────────────────────────────────────────────
  const [description, setDescription] = useState(isEditing ? editExpense.notes : '');
  const [amount, setAmount] = useState(isEditing ? String(editExpense.amount) : '');
  const [currency, setCurrency] = useState(
    isEditing ? editExpense.currency : (currentUser?.currency ?? homeCurrency ?? 'INR'),
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const CURRENCIES = ['USD','EUR','GBP','PKR','INR','CAD','AUD','AED','SAR','JPY','CNY','CHF','MYR','SGD'];
  const [saving, setSaving] = useState(false);

  // ── Participants ───────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>(() =>
    initialFriendId && initialFriendName
      ? [{ id: initialFriendId, name: initialFriendName }]
      : [],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId ?? null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── Payer + split ──────────────────────────────────────────
  const [payerId, setPayerId] = useState(myId);
  const [quickSplit, setQuickSplit] = useState<QuickSplit>('you_paid_equal');
  const [advSplitType, setAdvSplitType] = useState<AdvSplitType>('equal');

  // ── Advanced split state ────────────────────────────────────
  // Which members are included in the split
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(new Set());
  // Per-member percentage map (percentage mode)
  const [percentageMap, setPercentageMap] = useState<Record<string, string>>({});
  // Per-member exact amount map (exact mode)
  const [exactMap, setExactMap] = useState<Record<string, string>>({});

  // ── Date picker ────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // ── Friends + search for picker ────────────────────────────
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  // ── Derived ────────────────────────────────────────────────
  const numericAmount = parseFloat(amount) || 0;
  const sym = getSymbol(currency);
  const otherPerson = participants[0];
  const otherName = otherPerson?.name ?? 'them';
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const allParticipants: Participant[] = [{ id: myId, name: myName }, ...participants];

  // Hide nav header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Sync includedMembers when allParticipants changes ──────
  useEffect(() => {
    setIncludedMembers(new Set(allParticipants.map(p => p.id)));
    setPercentageMap({});
    setExactMap({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length, selectedGroupId]);

  // ── Load group members when group is pre-selected ──────────
  useEffect(() => {
    if (!initialGroupId || initialFriendId) return;
    setLoadingMembers(true);
    groupsService.getGroup(initialGroupId)
      .then(res => {
        const members: Participant[] = res.group.members
          .filter(m => m._id !== myId)
          .map(m => ({ id: m._id, name: m.name }));
        setParticipants(members);
      })
      .catch(() => {
        // Fallback: use store group member IDs with placeholder names
        const group = groups.find(g => g.id === initialGroupId);
        if (group) {
          setParticipants(
            group.members
              .filter(id => id !== myId)
              .map(id => ({ id, name: 'Member' })),
          );
        }
      })
      .finally(() => setLoadingMembers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroupId]);

  // ── Load friends for picker ────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!token) return;
    setLoadingFriends(true);
    try {
      const res = await friendsService.getFriends();
      setFriends(res.friends);
    } catch { /* offline */ }
    finally { setLoadingFriends(false); }
  }, [token]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // ── Split pill label ───────────────────────────────────────
  const splitPillText = (): string => {
    if (selectedGroupId) {
      const pName = payerId === myId ? 'you' : (allParticipants.find(p => p.id === payerId)?.name ?? 'them');
      return `Paid by ${pName} and split equally`;
    }
    switch (quickSplit) {
      case 'you_paid_equal':  return 'Paid by you and split equally';
      case 'you_paid_full':   return 'Paid by you (owed the full amount)';
      case 'they_paid_equal': return `Paid by ${otherName} and split equally`;
      case 'they_paid_full':  return `${otherName} is owed the full amount`;
    }
  };

  // ── Build split for save ───────────────────────────────────
  const buildSplit = (): { resolvedPayerId: string; splitMethod: SplitMethod; splitDetails: Record<string, number> } => {
    if (selectedGroupId) {
      // Advanced split is active when we're in split_advanced view — otherwise equal
      const included = allParticipants.filter(p => includedMembers.has(p.id));
      const ids = included.length > 0 ? included.map(p => p.id) : allParticipants.map(p => p.id);

      if (advSplitType === 'percentage') {
        const details: Record<string, number> = {};
        for (const id of ids) {
          details[id] = (numericAmount * (parseFloat(percentageMap[id] ?? '0') || 0)) / 100;
        }
        return { resolvedPayerId: payerId, splitMethod: 'percentage', splitDetails: Object.fromEntries(ids.map(id => [id, parseFloat(percentageMap[id] ?? '0') || 0])) };
      }
      if (advSplitType === 'exact') {
        const details: Record<string, number> = {};
        for (const id of ids) {
          details[id] = parseFloat(exactMap[id] ?? '0') || 0;
        }
        return { resolvedPayerId: payerId, splitMethod: 'custom', splitDetails: details };
      }
      // equal
      const share = numericAmount / ids.length;
      return { resolvedPayerId: payerId, splitMethod: 'equal', splitDetails: Object.fromEntries(ids.map(id => [id, share])) };
    }
    switch (quickSplit) {
      case 'you_paid_equal': {
        const share = numericAmount / 2;
        return { resolvedPayerId: myId, splitMethod: 'equal', splitDetails: { [myId]: share, ...(otherPerson && { [otherPerson.id]: share }) } };
      }
      case 'you_paid_full':
        return { resolvedPayerId: myId, splitMethod: 'custom', splitDetails: otherPerson ? { [otherPerson.id]: numericAmount } : { [myId]: 0 } };
      case 'they_paid_equal': {
        const share = numericAmount / 2;
        return { resolvedPayerId: otherPerson?.id ?? myId, splitMethod: 'equal', splitDetails: { [myId]: share, ...(otherPerson && { [otherPerson.id]: share }) } };
      }
      case 'they_paid_full':
        return { resolvedPayerId: otherPerson?.id ?? myId, splitMethod: 'custom', splitDetails: { [myId]: numericAmount } };
    }
  };

  // ── Scan receipt (OCR) ─────────────────────────────────────
  const handleScanReceipt = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: true, maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      if (result.didCancel || !result.assets?.[0]?.base64) return;
      const base64 = result.assets[0].base64;
      setSaving(true);
      const res = await apiFetch<{ amount?: number; merchant?: string; date?: string; rawText?: string }>('/expenses/scan-receipt', 'POST', { image: base64 });
      if (res.amount) setAmount(String(res.amount));
      if (res.merchant) setDescription(res.merchant);
      if (res.date) setExpenseDate(res.date.slice(0, 10));
      Alert.alert('Receipt scanned', res.merchant ? `Found: ${res.merchant}` : 'Could not extract all details. Please review.');
    } catch (err: any) {
      Alert.alert('OCR Failed', err?.message || 'Could not parse receipt.');
    } finally {
      setSaving(false);
    }
  };

  // ── Validate split ─────────────────────────────────────────
  const validateSplit = (): string | null => {
    if (!numericAmount || numericAmount <= 0) {
      return 'Please enter a valid amount.';
    }
    if (selectedGroupId && advSplitType === 'percentage') {
      const included = allParticipants.filter(p => includedMembers.has(p.id));
      const ids = included.length > 0 ? included.map(p => p.id) : allParticipants.map(p => p.id);
      const total = ids.reduce((s, id) => s + (parseFloat(percentageMap[id] ?? '0') || 0), 0);
      if (Math.abs(total - 100) > 0.5) {
        return `Percentages must total 100%. Current total: ${total.toFixed(1)}%.`;
      }
    }
    if (selectedGroupId && advSplitType === 'exact') {
      const included = allParticipants.filter(p => includedMembers.has(p.id));
      const ids = included.length > 0 ? included.map(p => p.id) : allParticipants.map(p => p.id);
      const total = ids.reduce((s, id) => s + (parseFloat(exactMap[id] ?? '0') || 0), 0);
      if (Math.abs(total - numericAmount) > 0.01) {
        return `Exact amounts must total ${fmtAmt(sym, numericAmount)}. Current total: ${fmtAmt(sym, total)}.`;
      }
    }
    return null;
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    const error = validateSplit();
    if (error) {
      Alert.alert('Invalid split', error);
      return;
    }
    setSaving(true);
    const { resolvedPayerId, splitMethod, splitDetails } = buildSplit();
    const isoDate = expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString();
    const effectiveGroupId = selectedGroupId ?? 'direct';

    if (isEditing) {
      const patch = { amount: numericAmount, notes: description.trim(), currency, splitMethod, splitDetails };
      updateExpense(editExpense.id, patch);
      if (token && editExpense.id.match(/^[a-f\d]{24}$/i)) {
        try { await expensesService.update(editExpense.id, patch); } catch { /* ignore */ }
      }
    } else {
      addExpense({
        id: `exp-${Date.now()}`,
        groupId: effectiveGroupId,
        amount: numericAmount,
        currency,
        payerId: resolvedPayerId,
        splitMethod,
        splitDetails,
        date: isoDate,
        notes: description.trim(),
        participantNames: Object.fromEntries(allParticipants.map(p => [p.id, p.name])),
      });
      if (token && selectedGroupId?.match(/^[a-f\d]{24}$/i)) {
        try {
          await apiFetch('/expenses', 'POST', {
            groupId: selectedGroupId, payerId: resolvedPayerId,
            amount: numericAmount, notes: description.trim(),
            date: isoDate, splitMethod, splitDetails, currency,
            participantNames: Object.fromEntries(allParticipants.map(p => [p.id, p.name])),
          });
        } catch {
          Alert.alert('Sync Warning', 'Saved locally but could not sync to server.');
        }
      }
    }

    setSaving(false);
    navigation.goBack();
  };

  // ── Toggle friend ──────────────────────────────────────────
  const toggleFriend = (f: FriendUser) => {
    const already = participants.some(p => p.id === f._id);
    if (already) {
      setParticipants(prev => prev.filter(p => p.id !== f._id));
    } else {
      setParticipants(prev => [...prev, { id: f._id, name: f.name }]);
      setSelectedGroupId(null);
    }
  };

  // ── Toggle group member (for re-inclusion) ─────────────────
  const toggleMember = (m: Participant) => {
    const already = participants.some(p => p.id === m.id);
    if (already) setParticipants(prev => prev.filter(p => p.id !== m.id));
    else setParticipants(prev => [...prev, m]);
  };

  const pickGroup = (gid: string) => {
    setSelectedGroupId(gid);
    setParticipants([]);
    setView('main');
    // Load the group's members
    if (token) {
      groupsService.getGroup(gid)
        .then(res => {
          const members: Participant[] = res.group.members
            .filter(m => m._id !== myId)
            .map(m => ({ id: m._id, name: m.name }));
          setParticipants(members);
        })
        .catch(() => {});
    }
  };

  // ── Filtered friends (search) ──────────────────────────────
  const filteredFriends = friendSearch.trim()
    ? friends.filter(f =>
        f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.email.toLowerCase().includes(friendSearch.toLowerCase()),
      )
    : friends;

  // ── Group members for picker (when group selected) ─────────
  // Show group participants as adjustable section in picker
  const groupParticipantsForPicker: Participant[] = selectedGroupId
    ? participants  // already loaded members
    : [];

  // ────────────────────────────────────────────────────────────
  // VIEW: PARTICIPANTS PICKER
  // ────────────────────────────────────────────────────────────
  if (view === 'participants') {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <IconButton
            icon="arrow-left"
            size={22}
            iconColor={theme.text}
            onPress={() => { setFriendSearch(''); setView('main'); }}
          />
          <PaperTextInput
            mode="flat"
            placeholder="Enter names, emails, or phone #s"
            value={friendSearch}
            onChangeText={setFriendSearch}
            autoFocus
            style={[styles.searchInput, { backgroundColor: 'transparent', flex: 1 }]}
            textColor={theme.text}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
        </View>

        <FlatList
          data={filteredFriends}
          keyExtractor={f => f._id}
          ListHeaderComponent={
            <>
              {/* Group members section (when a group is already selected) */}
              {selectedGroupId && groupParticipantsForPicker.length > 0 && !friendSearch && (
                <>
                  <Text style={[styles.sectionLabel, { color: '#888' }]}>
                    Group Members
                  </Text>
                  {groupParticipantsForPicker.map(m => {
                    const sel = participants.some(p => p.id === m.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                        onPress={() => toggleMember(m)}
                      >
                        <Av name={m.name} id={m.id} size={44} />
                        <Text style={[styles.pickerName, { color: theme.text }]}>{m.name}</Text>
                        <View style={[styles.radio, { borderColor: sel ? theme.primary : '#CCC' }]}>
                          {sel && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <Divider style={{ marginVertical: 8 }} />
                  <Text style={[styles.sectionLabel, { color: '#888' }]}>Add More</Text>
                </>
              )}
              {/* Friends section header */}
              {filteredFriends.length > 0 && !selectedGroupId && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <Text style={[styles.sectionLabel, { color: '#888' }]}>Recent</Text>
                </>
              )}
            </>
          }
          renderItem={({ item }) => {
            const sel = participants.some(p => p.id === item._id);
            return (
              <TouchableOpacity
                style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                onPress={() => toggleFriend(item)}
              >
                <Av name={item.name} id={item._id} size={44} />
                <Text style={[styles.pickerName, { color: theme.text }]}>{item.name}</Text>
                <View style={[styles.radio, { borderColor: sel ? theme.primary : '#CCC' }]}>
                  {sel && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <>
              {loadingFriends && <ActivityIndicator style={{ margin: 24 }} color={theme.primary} />}
              {!loadingFriends && !token && friends.length === 0 && (
                <View style={styles.emptyPicker}>
                  <Icon source="account-multiple-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyPickerText}>Sign in to see your friends here.</Text>
                </View>
              )}
              {!loadingFriends && token && friends.length === 0 && !friendSearch && (
                <View style={styles.emptyPicker}>
                  <Icon source="account-plus-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyPickerText}>No friends yet.{'\n'}Add friends from the Friends tab.</Text>
                </View>
              )}
              {/* Groups section */}
              {groups.length > 0 && !friendSearch && !selectedGroupId && (
                <>
                  <Divider style={{ marginVertical: 8 }} />
                  <Text style={[styles.sectionLabel, { color: '#888' }]}>Groups</Text>
                  {groups.map(g => {
                    const sel = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.pickerRow, { borderBottomColor: theme.border }]}
                        onPress={() => pickGroup(g.id)}
                      >
                        <View style={[styles.groupIconBox, { backgroundColor: avatarColor(g.id) }]}>
                          <Icon source="account-group" size={20} color="#FFF" />
                        </View>
                        <Text style={[styles.pickerName, { color: theme.text }]}>{g.name}</Text>
                        <View style={[styles.radio, { borderColor: sel ? theme.primary : '#CCC' }]}>
                          {sel && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <View style={[styles.pickerFooter, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <Button
            mode="contained"
            onPress={() => { setFriendSearch(''); setView('main'); }}
            style={{ borderRadius: 12 }}
          >
            Done{participants.length > 0 ? ` (${participants.length} selected)` : ''}
          </Button>
        </View>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────
  // VIEW: SPLIT QUICK ("Expense details")
  // ────────────────────────────────────────────────────────────
  if (view === 'split_quick') {
    const half = numericAmount / 2;
    const options: { key: QuickSplit; youPaid: boolean; title: string; subtitle: string }[] = [
      { key: 'you_paid_equal',  youPaid: true,  title: 'You paid, split equally.',          subtitle: `${otherName} owes you ${fmtAmt(sym, half)}.` },
      { key: 'you_paid_full',   youPaid: true,  title: 'You are owed the full amount.',      subtitle: `${otherName} owes you ${fmtAmt(sym, numericAmount)}.` },
      { key: 'they_paid_equal', youPaid: false, title: `${otherName} paid, split equally.`,  subtitle: `You owe ${otherName} ${fmtAmt(sym, half)}.` },
      { key: 'they_paid_full',  youPaid: false, title: `${otherName} is owed the full amount.`, subtitle: `You owe ${otherName} ${fmtAmt(sym, numericAmount)}.` },
    ];

    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <Button mode="text" onPress={() => setView('main')} textColor={theme.primary}>
            Cancel
          </Button>
          <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.text }]}>
            Expense details
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={[styles.quickBanner, { backgroundColor: theme.surface }]}>
          <Text style={{ color: '#666', fontSize: 14 }}>How was this expense split?</Text>
        </View>

        {options.map(opt => {
          const isSelected = quickSplit === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.splitOptionRow, { borderBottomColor: theme.border }]}
              onPress={() => {
                setQuickSplit(opt.key);
                setPayerId(opt.youPaid ? myId : (otherPerson?.id ?? myId));
              }}
            >
              <View style={styles.avatarPair}>
                {opt.youPaid ? (
                  <>
                    <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
                      <Av name={myName} id={myId} size={40} />
                    </View>
                    <View style={styles.avatarBehind}>
                      {otherPerson
                        ? <Av name={otherPerson.name} id={otherPerson.id} size={40} />
                        : <View style={styles.avatarEmpty} />}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.avatarRing, { borderColor: '#E8673A' }]}>
                      {otherPerson
                        ? <Av name={otherPerson.name} id={otherPerson.id} size={40} />
                        : <View style={styles.avatarEmpty} />}
                    </View>
                    <View style={styles.avatarBehind}>
                      <Av name={myName} id={myId} size={40} />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.splitOptionText}>
                <Text style={[styles.splitOptionTitle, { color: theme.text }]}>{opt.title}</Text>
                <Text style={[styles.splitOptionSub, { color: opt.youPaid ? '#0F7A5B' : '#E8673A' }]}>
                  {opt.subtitle}
                </Text>
              </View>

              {isSelected && <Icon source="check" size={22} color={theme.primary} />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.moreOptionsBtn, { borderColor: theme.border }]}
          onPress={() => setView('split_advanced')}
        >
          <Text style={{ color: theme.text, fontSize: 15 }}>More options</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────
  // VIEW: SPLIT ADVANCED ("Split options")
  // ────────────────────────────────────────────────────────────
  if (view === 'split_advanced') {
    const payer = allParticipants.find(p => p.id === payerId) ?? allParticipants[0];

    const cycleP = () => {
      const idx = allParticipants.findIndex(p => p.id === payerId);
      setPayerId(allParticipants[(idx + 1) % allParticipants.length].id);
    };

    const includedList = allParticipants.filter(p => includedMembers.has(p.id));
    const includedCount = includedList.length || 1;
    const equalShare = numericAmount / includedCount;

    // Percentage running total
    const percentTotal = allParticipants.reduce(
      (s, p) => s + (parseFloat(percentageMap[p.id] ?? '0') || 0), 0,
    );
    // Exact running total
    const exactTotal = allParticipants.reduce(
      (s, p) => s + (parseFloat(exactMap[p.id] ?? '0') || 0), 0,
    );
    const exactRemaining = numericAmount - exactTotal;

    const allIncluded = allParticipants.every(p => includedMembers.has(p.id));
    const toggleAll = () => {
      if (allIncluded) {
        setIncludedMembers(new Set([myId])); // always keep at least me
      } else {
        setIncludedMembers(new Set(allParticipants.map(p => p.id)));
      }
    };

    const TABS: { type: AdvSplitType; label: string }[] = [
      { type: 'equal', label: '=' },
      { type: 'exact', label: '1.23' },
      { type: 'percentage', label: '%' },
    ];

    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <Button mode="text" onPress={() => setView('split_quick')} textColor={theme.primary}>
            Cancel
          </Button>
          <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.text }]}>
            Split options
          </Text>
          <Button mode="text" onPress={() => setView('main')} textColor={theme.primary} labelStyle={{ fontWeight: '700' }}>
            Done
          </Button>
        </View>

        {/* Payer row — tap to cycle */}
        <TouchableOpacity style={[styles.payerRow, { borderBottomColor: theme.border }]} onPress={cycleP}>
          <Av name={payer?.name ?? myName} id={payer?.id ?? myId} size={44} />
          <Text style={[styles.payerLabel, { color: theme.text }]}>
            Paid by {payer?.id === myId ? 'you' : payer?.name}
          </Text>
          <Icon source="chevron-right" size={22} color="#999" />
        </TouchableOpacity>

        {/* Split type tabs */}
        <SegmentedButtons
          value={advSplitType}
          onValueChange={(v: string) => setAdvSplitType(v as AdvSplitType)}
          buttons={TABS.map(t => ({
            value: t.type,
            label: t.label,
          }))}
          style={{ marginVertical: 12 }}
        />

        <Text style={[styles.sectionLabel, { color: '#888' }]}>
          {advSplitType === 'equal'
            ? 'Select which people owe an equal share.'
            : advSplitType === 'percentage'
            ? 'Enter percentage for each person. Total must equal 100%.'
            : 'Enter exact amount owed by each person.'}
        </Text>

        {allParticipants.map(p => {
          const isIncluded = includedMembers.has(p.id);
          return (
            <View key={p.id} style={[styles.advMemberRow, { borderBottomColor: theme.border }]}>
              <Av name={p.name} id={p.id} size={44} />
              <Text style={[styles.advMemberName, { color: theme.text }]}>
                {p.id === myId ? `${p.name} (you)` : p.name}
              </Text>

              {advSplitType === 'equal' && (
                <>
                  {isIncluded && (
                    <Text style={{ color: '#888', fontSize: 13, marginRight: 8 }}>
                      {fmtAmt(sym, equalShare)}
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      const next = new Set(includedMembers);
                      if (isIncluded) { next.delete(p.id); } else { next.add(p.id); }
                      if (next.size === 0) next.add(p.id); // at least one
                      setIncludedMembers(next);
                    }}
                    style={[styles.radio, { borderColor: isIncluded ? theme.primary : '#CCC' }]}
                  >
                    {isIncluded && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                  </TouchableOpacity>
                </>
              )}

              {advSplitType === 'percentage' && (
                <View style={styles.advInputWrap}>
                  <RNTextInput
                    style={[styles.advInput, { color: theme.text, borderBottomColor: theme.primary }]}
                    placeholder="0"
                    placeholderTextColor="#AAA"
                    keyboardType="decimal-pad"
                    value={percentageMap[p.id] ?? ''}
                    onChangeText={v => setPercentageMap(prev => ({ ...prev, [p.id]: v }))}
                  />
                  <Text style={{ color: '#888', fontSize: 14 }}>%</Text>
                </View>
              )}

              {advSplitType === 'exact' && (
                <View style={styles.advInputWrap}>
                  <Text style={{ color: '#888', fontSize: 14 }}>{sym}</Text>
                  <RNTextInput
                    style={[styles.advInput, { color: theme.text, borderBottomColor: theme.primary }]}
                    placeholder="0.00"
                    placeholderTextColor="#AAA"
                    keyboardType="decimal-pad"
                    value={exactMap[p.id] ?? ''}
                    onChangeText={v => setExactMap(prev => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={[styles.advFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          {advSplitType === 'equal' && (
            <>
              <View>
                <Text style={[styles.advFooterAmt, { color: theme.text }]}>
                  {fmtAmt(sym, equalShare)}/person
                </Text>
                <Text style={styles.advFooterCount}>({includedCount} people)</Text>
              </View>
              <TouchableOpacity style={styles.allRow} onPress={toggleAll}>
                <Text style={{ color: theme.text, fontSize: 14 }}>All</Text>
                <View style={[styles.radio, { borderColor: allIncluded ? theme.primary : '#CCC' }]}>
                  {allIncluded && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
              </TouchableOpacity>
            </>
          )}
          {advSplitType === 'percentage' && (
            <View style={{ flex: 1 }}>
              <Text style={[styles.advFooterAmt, {
                color: Math.abs(percentTotal - 100) < 0.5 ? theme.primary : '#E8673A',
              }]}>
                {percentTotal.toFixed(1)}% of 100%
              </Text>
              {Math.abs(percentTotal - 100) >= 0.5 && (
                <Text style={{ color: '#E8673A', fontSize: 12 }}>
                  {percentTotal < 100 ? `${(100 - percentTotal).toFixed(1)}% remaining` : `${(percentTotal - 100).toFixed(1)}% over`}
                </Text>
              )}
            </View>
          )}
          {advSplitType === 'exact' && (
            <View style={{ flex: 1 }}>
              <Text style={[styles.advFooterAmt, {
                color: Math.abs(exactRemaining) < 0.01 ? theme.primary : '#E8673A',
              }]}>
                {exactRemaining >= 0 ? `${fmtAmt(sym, exactRemaining)} remaining` : `${fmtAmt(sym, Math.abs(exactRemaining))} over`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────
  // VIEW: MAIN FORM
  // ────────────────────────────────────────────────────────────
  const withLabel = selectedGroup
    ? `${selectedGroup.name}${participants.length > 0 ? ` · ${participants.length + 1} people` : ''}`
    : participants.length > 0
    ? participants.map(p => p.name).join(', ')
    : undefined;

  const openSplitPicker = () => {
    if (!participants.length && !selectedGroupId) {
      Alert.alert('Add someone first', 'Select a friend or group to split with.');
      return;
    }
    setView('split_quick');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
        <IconButton
          icon="close"
          size={24}
          iconColor={theme.text}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.text }]}>
          {isEditing ? 'Edit expense' : 'Add an expense'}
        </Text>
        <Button
          mode="text"
          onPress={handleSave}
          disabled={saving}
          textColor={saving ? '#AAA' : theme.primary}
          labelStyle={{ fontWeight: '700' }}
        >
          {saving ? '…' : 'Save'}
        </Button>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* ── "With you and:" row ── */}
      {!isEditing && (
        <TouchableOpacity
          style={[styles.withRow, { borderBottomColor: theme.border }]}
          onPress={() => setView('participants')}
          activeOpacity={0.7}
        >
          <Text style={styles.withLabel}>With you and:</Text>
          <View style={styles.withRight}>
            {loadingMembers ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : withLabel ? (
              <View style={[styles.participantChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Av
                  name={withLabel}
                  id={selectedGroupId ?? participants[0]?.id ?? 'x'}
                  size={26}
                />
                <Text style={[styles.chipLabel, { color: theme.text }]} numberOfLines={1}>
                  {withLabel}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Enter names, emails, or phone #s
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ── Description + Amount ── */}
      <View style={styles.formArea}>
        <PaperTextInput
          mode="flat"
          label="What was this for?"
          value={description}
          onChangeText={setDescription}
          style={[styles.descField, { backgroundColor: 'transparent' }]}
          textColor={theme.text}
          underlineColor={theme.border}
          activeUnderlineColor={theme.primary}
          left={<PaperTextInput.Icon icon="receipt" color="#999" />}
          returnKeyType="next"
        />

        <View style={[styles.amountRow, { borderBottomColor: theme.primary, marginTop: 8 }]}>
          <TouchableOpacity onPress={() => setCurrencyOpen(true)} style={styles.currencyBtn}>
            <Text style={[styles.symLabel, { color: theme.primary }]} numberOfLines={1}>{currency}</Text>
            <View style={{ marginLeft: 2 }}>
              <Icon source="chevron-down" size={14} color={theme.primary} />
            </View>
          </TouchableOpacity>
          <PaperTextInput
            mode="flat"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus={!isEditing}
            style={[styles.amountField, { backgroundColor: 'transparent', flex: 1 }]}
            textColor={theme.text}
            underlineColor={theme.primary}
            activeUnderlineColor={theme.primary}
          />
        </View>

        {/* Split pill */}
        <Chip
          icon="calculator"
          mode="outlined"
          onPress={openSplitPicker}
          style={[styles.splitPill, { borderColor: theme.border }]}
          textStyle={{ color: theme.text, fontSize: 14 }}
        >
          {splitPillText()}
        </Chip>
      </View>

      {/* ── Bottom toolbar ── */}
      <View style={[styles.toolbar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            setDatePickerVisible(true);
          }}
        >
          <Icon source="calendar-outline" size={22} color={theme.primary} />
          <Text style={[styles.toolBtnLabel, { color: theme.primary }]}>
            {expenseDate === todayStr ? 'Today' : expenseDate}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={() => setView('participants')}>
          <Icon source="account-group-outline" size={22} color="#E8673A" />
          <Text style={[styles.toolBtnLabel, { color: '#E8673A' }]}>
            {selectedGroup?.name ?? 'No group'}
          </Text>
        </TouchableOpacity>

        <View style={styles.toolSpacer} />

        <TouchableOpacity style={styles.toolIconBtn} onPress={handleScanReceipt}>
          <Icon source="camera-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolIconBtn}>
          <Icon source="pencil-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Date Picker Modal ── */}
      <DatePickerModal
        locale="en"
        mode="single"
        visible={datePickerVisible}
        onDismiss={() => setDatePickerVisible(false)}
        date={new Date(expenseDate)}
        onConfirm={({ date }) => {
          if (date) {
            setExpenseDate(date.toISOString().slice(0, 10));
          }
          setDatePickerVisible(false);
        }}
      />

      {/* ── Currency Picker Modal ── */}
      <RNModal visible={currencyOpen} transparent animationType="slide">
        <View style={[styles.currencyOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <View style={[styles.currencySheet, { backgroundColor: theme.background }]}>
            <View style={[styles.currencyHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.currencyTitle, { color: theme.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyOpen(false)}>
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={c => c}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.currencyRow, { borderBottomColor: theme.border }]}
                  onPress={() => { setCurrency(item); setCurrencyOpen(false); }}
                >
                  <Text style={{ color: theme.text, fontSize: 16 }}>{item}</Text>
                  {currency === item && <Icon source="check" size={20} color={theme.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </RNModal>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 64, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerAction: { fontSize: 16 },

  // "With you and:" row
  withRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  withLabel: { color: '#888', fontSize: 15, flexShrink: 0 },
  withRight: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  participantChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, maxWidth: '82%',
  },
  chipLabel: { marginLeft: 6, fontSize: 14, fontWeight: '500', flexShrink: 1 },
  placeholderText: { color: '#AAA', fontSize: 14, flex: 1, marginLeft: 6 },

  // Form
  formArea: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, paddingBottom: 8, marginBottom: 16,
  },
  descField: { flex: 1, fontSize: 18, paddingVertical: 4 },
  symLabel: { fontSize: 28, fontWeight: '300', minWidth: 52, textAlign: 'center' },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 2, paddingBottom: 8, marginBottom: 16,
  },
  amountField: { flex: 1, fontSize: 36, fontWeight: '300', paddingVertical: 4 },
  splitPill: {
    alignSelf: 'center', marginTop: 28,
    paddingHorizontal: 22, paddingVertical: 13,
    borderWidth: 1, borderRadius: 26,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  toolBtnLabel: { fontSize: 14 },
  toolIconBtn: { padding: 8 },
  toolSpacer: { flex: 1 },

  // Participant picker
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  sectionLabel: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    fontSize: 13, fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerName: { flex: 1, fontSize: 16 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  groupIconBox: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyPicker: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyPickerText: { color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  pickerFooter: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  doneBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Split quick
  quickBanner: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  splitOptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  splitOptionText: { flex: 1 },
  splitOptionTitle: { fontSize: 14, fontWeight: '500' },
  splitOptionSub: { fontSize: 13, marginTop: 2 },
  avatarPair: { flexDirection: 'row', alignItems: 'center', width: 76 },
  avatarRing: { borderRadius: 23, borderWidth: 2.5, padding: 1.5 },
  avatarBehind: { marginLeft: -14, zIndex: -1 },
  avatarEmpty: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CCC' },
  moreOptionsBtn: {
    marginTop: 28, marginHorizontal: 40, borderRadius: 22,
    borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },

  // Split advanced
  payerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payerLabel: { flex: 1, marginLeft: 12, fontSize: 15 },
  tabRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  advMemberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  advMemberName: { flex: 1, marginLeft: 12, fontSize: 15 },
  advInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 90 },
  advInput: {
    width: 70, fontSize: 15, textAlign: 'right',
    borderBottomWidth: 1.5, paddingVertical: 2,
  },
  advFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  advFooterAmt: { fontWeight: '700', fontSize: 15 },
  advFooterCount: { color: '#888', fontSize: 12 },
  allRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Date picker
  dateOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  datePicker: {
    width: '85%', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  datePickerTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  dateChips: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  dateInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, marginBottom: 16,
  },
  dateConfirmBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },

  // Currency picker
  currencyBtn: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  currencyOverlay: { flex: 1, justifyContent: 'flex-end' },
  currencySheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currencyTitle: { fontSize: 17, fontWeight: '600' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
