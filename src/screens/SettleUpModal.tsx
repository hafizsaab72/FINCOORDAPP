import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Text, ActivityIndicator,
  TextInput, Button, Card, Avatar, Divider, TouchableRipple,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsService } from '../services/groupsService';
import { MemberBalance } from '../types';

// ─── helpers ───────────────────────────────────────────────────
const AVATAR_COLORS = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#4FC3F7', '#4DB6AC'];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

// ──────────────────────────────────────────────────────────────
export default function SettleUpModal({ navigation, route }: any) {
  const {
    groupId,
    members = [] as MemberBalance[],
    preselectedMemberId,
  } = route.params ?? {};

  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);
  const homeCurrency = useStore(s => s.currency);
  const addExpense = useStore(s => s.addExpense);

  const myId = currentUser?.id ?? '';
  const myName = currentUser?.name ?? 'You';
  const currency = currentUser?.currency ?? homeCurrency ?? 'INR';

  // Step 1: select who to settle with
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(preselectedMemberId ?? null);
  const [step, setStep] = useState<'select' | 'amount'>('select');

  // Step 2: amount entry
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Settlement payment');
  const [saving, setSaving] = useState(false);

  const allMembers: MemberBalance[] = [
    { memberId: myId, name: myName, email: currentUser?.email ?? '', isMe: true, net: 0 },
    ...members.filter((m: MemberBalance) => m.memberId !== myId),
  ];

  const settleableMembers = allMembers.filter((m: MemberBalance) => {
    if (m.memberId === myId) return false;
    return Math.abs(m.net) > 0.005;
  });

  const selectedMember = allMembers.find((m: MemberBalance) => m.memberId === selectedMemberId);

  const handleSelectMember = (member: MemberBalance) => {
    setSelectedMemberId(member.memberId);
    const net = Math.abs(member.net);
    setAmount(net > 0.005 ? net.toFixed(2) : '');
    setStep('amount');
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (!selectedMemberId) {
      Alert.alert('Selection required', 'Please select who to settle with.');
      return;
    }

    const member = selectedMember;
    if (!member) return;

    const payerId = member.net > 0 ? member.memberId : myId;
    const receiverId = member.net > 0 ? myId : member.memberId;

    setSaving(true);
    try {
      addExpense({
        id: `settle-${Date.now()}`,
        groupId,
        amount: numAmount,
        currency,
        payerId,
        splitMethod: 'custom',
        splitDetails: { [receiverId]: numAmount },
        date: new Date().toISOString(),
        notes: note.trim() || 'Settlement',
        participantNames: Object.fromEntries(
          allMembers.map((m: MemberBalance) => [m.memberId, m.name]),
        ),
      });

      if (groupId?.match(/^[a-f\d]{24}$/i)) {
        await groupsService.settle(groupId, { payerId, receiverId, amount: numAmount, currency });
      }

      navigation.goBack();
    } catch {
      Alert.alert('Sync Warning', 'Saved locally but could not sync to server.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (step === 'select') {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <Button
            icon="close"
            textColor={theme.text}
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
          >
            Cancel
          </Button>
          <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.text }]}>
            Settle up
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.selectBody}>
          <Text variant="headlineSmall" style={{ color: theme.text, fontWeight: '600', marginBottom: 20 }}>
            Which balance do you want to settle?
          </Text>

          {settleableMembers.length === 0 ? (
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Everyone is settled up!
            </Text>
          ) : (
            settleableMembers.map((member: MemberBalance, idx: number) => (
              <React.Fragment key={member.memberId}>
                {idx > 0 && <Divider />}
                <TouchableRipple
                  onPress={() => handleSelectMember(member)}
                  rippleColor="rgba(0,0,0,0.06)"
                >
                  <View style={styles.selectRowInner}>
                    <Avatar.Text
                      size={44}
                      label={getInitials(member.name)}
                      style={{ backgroundColor: avatarColor(member.memberId) }}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                        {member.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                        {member.email}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, color: member.net > 0 ? '#0F7A5B' : '#E8673A' }}>
                        {member.net > 0 ? 'owes you' : 'you owe'}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: member.net > 0 ? '#0F7A5B' : '#E8673A' }}>
                        {currency} {Math.abs(member.net).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              </React.Fragment>
            ))
          )}

          <Button
            mode="text"
            onPress={() => setStep('amount')}
            style={{ marginTop: 16, alignSelf: 'center' }}
          >
            More options
          </Button>
        </ScrollView>
      </View>
    );
  }

  // Amount entry step
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
        <Button
          mode="text"
          onPress={() => setStep('select')}
          textColor={theme.primary}
          style={styles.headerBtn}
        >
          Back
        </Button>
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.text }]}>
          Settle up
        </Text>
        <Button
          mode="text"
          onPress={handleSave}
          disabled={saving}
          textColor={theme.primary}
          style={styles.headerBtn}
        >
          {saving ? <ActivityIndicator size="small" color={theme.primary} /> : 'Done'}
        </Button>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {selectedMember && (
            <Card style={[styles.selectedCard, { backgroundColor: theme.surface }]}>
              <Card.Content style={styles.selectedCardContent}>
                <Avatar.Text
                  size={48}
                  label={getInitials(selectedMember.name)}
                  style={{ backgroundColor: avatarColor(selectedMember.memberId) }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                    {selectedMember.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: selectedMember.net > 0 ? '#0F7A5B' : '#E8673A' }}>
                    {selectedMember.net > 0 ? 'owes you' : 'you owe'}{' '}
                    {currency} {Math.abs(selectedMember.net).toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          <TextInput
            label={`Amount (${currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            mode="flat"
            style={[styles.amountInput, { backgroundColor: 'transparent' }]}
            textColor={theme.text}
            underlineColor={theme.primary}
            activeUnderlineColor={theme.primary}
            left={<TextInput.Affix text={currency} />}
          />

          <TextInput
            label="Note"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={[styles.noteInput, { backgroundColor: theme.surface }]}
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            left={<TextInput.Icon icon="pencil-outline" color={theme.textSecondary} />}
            placeholder="Add a note…"
          />

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={[styles.recordBtn, { backgroundColor: '#E8673A' }]}
            labelStyle={styles.recordBtnLabel}
          >
            Record payment
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 56, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 64, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  // Select step
  selectBody: { padding: 20 },
  selectRowInner: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
  },

  // Amount step
  body: { padding: 20, paddingBottom: 48 },
  selectedCard: { borderRadius: 12, marginBottom: 8 },
  selectedCardContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  amountInput: { fontSize: 28, marginTop: 8 },
  noteInput: { marginTop: 16 },
  recordBtn: {
    marginTop: 32, borderRadius: 14, paddingVertical: 6,
  },
  recordBtnLabel: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
