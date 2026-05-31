import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Text, ActivityIndicator,
  TextInput, Button, Card, Avatar, Divider, TouchableRipple, Surface, useTheme,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsService } from '../services/groupsService';
import { friendsService } from '../services/friendsService';
import { haptics } from '../utils/haptics';
import { Activity, MemberBalance } from '../types';
import { queryClient } from '../../App';
import { fromMinorUnits } from '../utils/currency';

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
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);
  const homeCurrency = useStore(s => s.currency);

  const myId = currentUser?.id ?? '';
  const myName = currentUser?.name ?? 'You';
  const currency = currentUser?.currency ?? homeCurrency ?? 'INR';

  // Step 1: select who to settle with
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(preselectedMemberId ?? null);
  const [step, setStep] = useState<'select' | 'amount'>('select');

  // Step 2: amount entry
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // members from API are already in major units, but guard against minor-unit data
  const allMembers: MemberBalance[] = useMemo(() => {
    const others = members
      .filter((m: MemberBalance) => m.memberId !== myId)
      .map((m: MemberBalance) => ({
        ...m,
        net: Math.abs(m.net) > 10000 ? fromMinorUnits(m.net) : m.net,
      }));
    return [
      { memberId: myId, name: myName, email: currentUser?.email ?? '', isMe: true, net: 0 },
      ...others,
    ];
  }, [members, myId, myName, currentUser]);

  const settleableMembers = allMembers.filter((m: MemberBalance) => {
    if (m.memberId === myId) return false;
    return Math.abs(m.net) > 0.005;
  });

  const selectedMember = allMembers.find((m: MemberBalance) => m.memberId === selectedMemberId);

  const handleSelectMember = (member: MemberBalance) => {
    haptics.selection();
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

    const direction = member.net > 0 ? `${member.name} pays you` : `You pay ${member.name}`;
    Alert.alert(
      'Confirm settlement',
      `${direction} ${currency} ${numAmount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: async () => {
            setSaving(true);
            try {
              let res: any;

              if (groupId === 'direct') {
                res = await friendsService.settle(member.memberId, {
                  amount: numAmount,
                  note: note.trim() || 'Settlement',
                });
              } else {
                res = await groupsService.settle(groupId, {
                  withMemberId: member.memberId,
                  amount: numAmount,
                  note: note.trim() || 'Settlement',
                });
              }

              haptics.success();
              await queryClient.invalidateQueries();
              Alert.alert('Settlement recorded', res?.message || 'The payment has been recorded successfully.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not record settlement. Please check your connection and try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
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
          <Text variant="headlineSmall" style={{ color: theme.text, marginBottom: 20 }}>
            Which balance do you want to settle?
          </Text>

          {settleableMembers.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Everyone is settled up!
            </Text>
          ) : (
            settleableMembers.map((member: MemberBalance, idx: number) => (
              <React.Fragment key={member.memberId}>
                {idx > 0 && <Divider style={{ marginVertical: 4 }} />}
                <Surface elevation={1} style={[styles.memberSurface, { backgroundColor: theme.surface }]}>
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
                        <Text variant="titleMedium" style={{ color: theme.text }}>
                          {member.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                          {member.email}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="labelSmall" style={{ color: member.net > 0 ? theme.primary : paperTheme.colors.error }}>
                          {member.net > 0 ? 'owes you' : 'you owe'}
                        </Text>
                        <Text variant="titleMedium" style={{ color: member.net > 0 ? theme.primary : paperTheme.colors.error }}>
                          {currency} {Math.abs(member.net).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                </Surface>
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
                  <Text variant="titleMedium" style={{ color: theme.text }}>
                    {selectedMember.name}
                  </Text>
                  <Text variant="labelSmall" style={{ color: selectedMember.net > 0 ? theme.primary : paperTheme.colors.error }}>
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
            mode="outlined"
            style={[styles.amountInput, { backgroundColor: 'transparent' }]}
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
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
            style={[styles.recordBtn, { backgroundColor: paperTheme.colors.error }]}
            labelStyle={{ color: paperTheme.colors.onError, fontWeight: '700', fontSize: 16 }}
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
  memberSurface: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  selectRowInner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, width: '100%',
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
});
