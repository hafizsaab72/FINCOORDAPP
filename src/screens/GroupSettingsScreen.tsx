import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, FlatList, Alert, Image, ScrollView, TextInput as RNTextInput,
} from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import {
  Text, Button, Divider, List, ActivityIndicator,
  Portal, Modal, Icon, Surface, Switch, Checkbox,
  TouchableRipple, IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup } from '../services/groupsService';
import { friendsService, FriendUser } from '../services/friendsService';
import { GroupBalancesData, GroupMember } from '../types';
import { GROUP_TYPES, GROUP_ICONS, getGroupIconConfig } from '../constants/groupTypes';
import { getSymbol, fromMinorUnits } from '../utils/currency';
import { haptics } from '../utils/haptics';

function MemberAvatar({ member, size = 44 }: { member: GroupMember; size?: number }) {
  const { theme } = useAppTheme();
  if (member.profilePic) {
    return (
      <Image
        source={{ uri: member.profilePic }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: theme.onPrimary, fontWeight: '700', fontSize: size * 0.4 }}>
        {(member.name?.[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

export default function GroupSettingsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

  // ── Group data ───────────────────────────────────────────────────────────
  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [balances, setBalances] = useState<GroupBalancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Editable fields ──────────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editType, setEditType] = useState('other');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Simplify debts ───────────────────────────────────────────────────────
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [togglingSimplify, setTogglingSimplify] = useState(false);

  // ── Add member modal ─────────────────────────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCreator = group?.createdBy?._id === currentUser?.id;
  const myNet = balances ? balances.totalOwedToYou - balances.totalYouOwe : 0;
  const hasOutstanding = Math.abs(myNet) > 0.005;

  // ── Load group + balances ────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [groupRes, balancesRes] = await Promise.allSettled([
      groupsService.getGroup(groupId),
      groupsService.getBalances(groupId),
    ]);
    if (groupRes.status === 'fulfilled') {
      const g = groupRes.value.group;
      setGroup(g);
      setEditName(g.name);
      setEditIcon(g.icon || '');
      setEditType(g.type || 'other');
      if (g.image) setEditImageUri(g.image);
      setSimplifyDebts(g.simplifyDebts ?? true);
      setIsDirty(false);
    } else {
      setError((groupRes.reason as any)?.message ?? 'Could not load group.');
    }
    if (balancesRes.status === 'fulfilled') {
      const b = balancesRes.value;
      setBalances({
        totalOwedToYou: fromMinorUnits(b.totalOwedToYou),
        totalYouOwe: fromMinorUnits(b.totalYouOwe),
        memberBalances: b.memberBalances.map(m => ({
          ...m,
          net: fromMinorUnits(m.net),
        })),
        simplifiedTransactions: b.simplifiedTransactions?.map(tx => ({
          ...tx,
          amount: fromMinorUnits(tx.amount),
        })) ?? undefined,
      });
    }
    setLoading(false);
  };

  // ── Detect dirty ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!group) return;
    const dirty =
      editName !== group.name ||
      editIcon !== (group.icon || '') ||
      editType !== (group.type || 'other') ||
      editImageBase64 !== null;
    setIsDirty(dirty);
  }, [editName, editIcon, editType, editImageBase64, group]);

  // ── Photo picker ─────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    haptics.light();
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.5,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.uri) setEditImageUri(asset.uri);
      if (asset.base64) setEditImageBase64(`data:image/jpeg;base64,${asset.base64}`);
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleClearPhoto = () => {
    setEditImageUri(null);
    setEditImageBase64(null);
  };

  // ── Save group info ──────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!group) return;
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert('Name required', 'Group name must be at least 2 characters.');
      return;
    }
    const patch: any = {
      name: editName.trim(),
      type: editType,
      icon: editIcon,
    };
    if (editImageBase64) {
      patch.image = editImageBase64;
    } else if (editImageUri === null && group.image) {
      // User cleared the photo
      patch.image = '';
    }

    setSavingInfo(true);
    try {
      await groupsService.update(groupId, patch);
      await loadAll();
      haptics.success();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save changes.');
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Simplify debts toggle ────────────────────────────────────────────────
  const handleToggleSimplify = async (value: boolean) => {
    haptics.selection();
    setSimplifyDebts(value);
    setTogglingSimplify(true);
    try {
      await groupsService.update(groupId, { simplifyDebts: value });
    } catch (e: any) {
      setSimplifyDebts(!value);
      Alert.alert('Error', e.message);
    } finally {
      setTogglingSimplify(false);
    }
  };

  // ── Add member ───────────────────────────────────────────────────────────
  const handleAddMember = async (user: FriendUser) => {
    haptics.light();
    setAddingId(user._id);
    try {
      const data = await groupsService.addMember(groupId, user._id);
      setGroup(data.group);
      setSearchResults(prev => prev.filter(u => u._id !== user._id));
      setFriends(prev => prev.filter(u => u._id !== user._id));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddingId(null);
    }
  };

  // ── Remove member (kick) ─────────────────────────────────────────────────
  const handleRemoveMember = (member: GroupMember) => {
    if (!isCreator) return;
    const memberBalance = balances?.memberBalances.find(b => b.memberId === member._id);
    const net = memberBalance?.net ?? 0;
    const hasBalance = Math.abs(net) > 0.005;

    Alert.alert(
      'Remove Member',
      hasBalance
        ? `${member.name} has an outstanding balance of ${symbol}${Math.abs(net).toFixed(2)}. Removing them will recalculate group balances. Continue?`
        : `Remove ${member.name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await groupsService.removeMember(groupId, member._id);
              setGroup(data.group);
              // Refresh balances after removal (backend recalculates them)
              const freshBalances = await groupsService.getBalances(groupId);
              setBalances(freshBalances);
              haptics.success();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  // ── Leave group ──────────────────────────────────────────────────────────
  const handleLeaveGroup = () => {
    if (hasOutstanding) {
      Alert.alert(
        'Cannot Leave',
        'You have outstanding balances in this group. Settle up before leaving.',
      );
      return;
    }
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            if (!currentUser) return;
            await groupsService.leave(groupId);
            navigation.pop(2);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  // ── Delete group ─────────────────────────────────────────────────────────
  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'This will permanently delete the group and all its expenses. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await groupsService.deleteGroup(groupId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  // ── Debounced search for add member ──────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]); setSearching(false); return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await friendsService.search(searchQuery.trim(), true);
        const memberIds = new Set(group?.members.map(m => m._id) ?? []);
        setSearchResults(data.users.filter(u => !memberIds.has(u._id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery, group]);

  // ── Render states ────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>
          Sign in to manage group settings.
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('SignIn')} style={{ backgroundColor: theme.primary }}>Sign In</Button>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="bodyMedium" style={{ color: theme.error, textAlign: 'center', marginBottom: 12 }}>
          {error || 'Group not found.'}
        </Text>
        <Button onPress={loadAll}>Retry</Button>
      </View>
    );
  }

  const selectedIconConfig = getGroupIconConfig(editIcon);

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.background }]} contentContainerStyle={styles.container}>

      {/* ── Group Info Card ──────────────────────────────────────────────── */}
      <Surface style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        {/* Icon + Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Icon picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {GROUP_ICONS.map((ic) => {
              const selected = editIcon === ic.key;
              return (
                <TouchableRipple
                  key={ic.key}
                  onPress={() => {
                    haptics.selection();
                    setEditIcon(ic.key);
                  }}
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: selected ? ic.color + '20' : theme.surface,
                      borderColor: selected ? ic.color : theme.border,
                    },
                  ]}
                  borderless
                >
                  <Icon source={ic.icon} size={22} color={selected ? ic.color : theme.textSecondary} />
                </TouchableRipple>
              );
            })}
          </ScrollView>
        </View>

        {/* Name input */}
        <PaperTextInput
          mode="outlined"
          label="Group Name"
          value={editName}
          onChangeText={setEditName}
          style={{ backgroundColor: theme.surface }}
          textColor={theme.text}
        />

        {/* Photo picker */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <TouchableRipple
            style={[styles.photoPicker, { borderColor: theme.border }]}
            onPress={handlePickPhoto}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {editImageUri ? (
                <Image source={{ uri: editImageUri }} style={styles.photoPreview} />
              ) : (
                <Icon source="camera-plus" size={24} color={theme.textSecondary} />
              )}
            </View>
          </TouchableRipple>
          {editImageUri && (
            <IconButton icon="close-circle" size={20} iconColor={theme.textSecondary} onPress={handleClearPhoto} />
          )}
          <Text variant="bodySmall" style={{ color: theme.textSecondary, flex: 1 }}>
            {editImageUri ? 'Tap to change photo' : 'Add a group photo'}
          </Text>
        </View>

        {/* Type selector */}
        <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
          Type
        </Text>
        <View style={styles.typeGrid}>
          {GROUP_TYPES.map((t) => {
            const selected = editType === t.key;
            return (
              <Surface
                key={t.key}
                style={[styles.typeCard, { borderColor: selected ? theme.primary : theme.border }]}
                elevation={0}
              >
                <TouchableRipple
                  onPress={() => {
                    haptics.selection();
                    setEditType(t.key);
                  }}
                  style={{ flex: 1 }}
                >
                  <View style={{
                    flex: 1, alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 12,
                    backgroundColor: selected ? theme.primary + '14' : theme.surface,
                  }}>
                    <Icon source={t.icon} size={20} color={selected ? theme.primary : theme.textSecondary} />
                    <Text
                      variant="labelSmall"
                      style={{
                        color: selected ? theme.primary : theme.text,
                        marginTop: 4, fontWeight: selected ? '700' : '500',
                      }}
                    >
                      {t.label}
                    </Text>
                  </View>
                </TouchableRipple>
              </Surface>
            );
          })}
        </View>

        {/* Save button */}
        {isDirty && (
          <Button
            mode="contained"
            onPress={handleSaveInfo}
            loading={savingInfo}
            disabled={savingInfo}
            style={{ marginTop: 16, borderRadius: 8 }}
          >
            Save Changes
          </Button>
        )}
      </Surface>

      {/* ── Members Section ──────────────────────────────────────────────── */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
        Members ({group.members.length})
      </Text>

      <Surface style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        {group.members.map((member, idx) => {
          const isMe = member._id === currentUser?.id;
          const memberBalance = balances?.memberBalances.find(b => b.memberId === member._id);
          const net = memberBalance?.net ?? 0;

          return (
            <React.Fragment key={member._id}>
              {idx > 0 && <Divider style={{ marginLeft: 72 }} />}
              <TouchableRipple
                onPress={() => {
                  if (isCreator && !isMe && member._id !== group.createdBy?._id) {
                    handleRemoveMember(member);
                  }
                }}
                disabled={!isCreator || isMe || member._id === group.createdBy?._id}
              >
                <View style={styles.memberRow}>
                  <MemberAvatar member={member} />
                  <View style={styles.memberInfo}>
                    <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                      {member.name}{isMe ? ' (you)' : ''}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{member.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {!isMe && Math.abs(net) > 0.005 && (
                      <>
                        <Text variant="bodySmall" style={{ color: net > 0 ? theme.success : theme.error }}>
                          {net > 0 ? 'gets back' : 'owes'}
                        </Text>
                        <Text variant="titleSmall" style={{ color: net > 0 ? theme.success : theme.error }}>
                          {symbol}{Math.abs(net).toFixed(2)}
                        </Text>
                      </>
                    )}
                    {!isMe && Math.abs(net) <= 0.005 && (
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>settled up</Text>
                    )}
                    {isMe && (
                      <Text variant="bodySmall" style={{ color: theme.primary }}>
                        {member._id === group.createdBy?._id ? 'Owner' : 'You'}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableRipple>
            </React.Fragment>
          );
        })}

        {/* Former members with outstanding balance (pre-recalc or edge case) */}
        {balances?.memberBalances
          ?.filter(b => b.isFormerMember && Math.abs(b.net) > 0.005)
          .map((fm, idx) => (
            <React.Fragment key={`former-${fm.memberId}`}>
              {(idx > 0 || group.members.length > 0) && <Divider style={{ marginLeft: 72 }} />}
              <View style={[styles.memberRow, { opacity: 0.6 }]}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>
                    {(fm.name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                    {fm.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Former member</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodySmall" style={{ color: fm.net > 0 ? theme.success : theme.error }}>
                    {fm.net > 0 ? 'gets back' : 'owes'}
                  </Text>
                  <Text variant="titleSmall" style={{ color: fm.net > 0 ? theme.success : theme.error }}>
                    {symbol}{Math.abs(fm.net).toFixed(2)}
                  </Text>
                </View>
              </View>
            </React.Fragment>
          ))}
      </Surface>

      <Button
        mode="text"
        icon="account-plus-outline"
        textColor={theme.primary}
        onPress={() => {
          haptics.light();
          setAddModalVisible(true);
          setSearchQuery('');
          setSearchResults([]);
          setFriendsLoading(true);
          friendsService.getFriends()
            .then(data => {
              const memberIds = new Set(group.members.map(m => m._id));
              setFriends(data.friends.filter(f => !memberIds.has(f._id)));
            })
            .catch(() => setFriends([]))
            .finally(() => setFriendsLoading(false));
        }}
        style={{ alignSelf: 'flex-start', marginTop: 8 }}
      >
        Add member
      </Button>

      {/* ── Advanced Settings ────────────────────────────────────────────── */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Advanced settings</Text>

      <Surface style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} elevation={0}>
        {/* Simplify debts */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Icon source="source-branch" size={22} color={theme.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>Simplify group debts</Text>
            <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Automatically combines debts to reduce the total number of repayments between group members.
            </Text>
          </View>
          <Switch
            value={simplifyDebts}
            onValueChange={handleToggleSimplify}
            color={theme.primary}
            disabled={togglingSimplify}
          />
        </View>

        <Divider style={{ marginLeft: 56 }} />

        {/* Default split */}
        <List.Item
          title="Default split"
          description="Paid by you and split equally"
          left={props => <List.Icon {...props} icon="call-split" color={theme.textSecondary} />}
          right={() => (
            <View style={styles.proBadge}>
              <Text variant="labelSmall" style={{ color: theme.info, fontWeight: '700' }}>PRO</Text>
            </View>
          )}
          onPress={() => navigation.navigate('AccountTab', { screen: 'Upgrade' })}
          titleStyle={{ color: theme.text, fontWeight: '600' }}
          descriptionStyle={{ color: theme.textSecondary }}
        />
      </Surface>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      {!isCreator && (
        <Surface style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]} elevation={0}>
          <List.Item
            title="Leave group"
            description={hasOutstanding ? "You can't leave this group because you have outstanding debts with other group members." : undefined}
            left={props => <List.Icon {...props} icon="logout" color={hasOutstanding ? theme.textSecondary : theme.warning} />}
            onPress={handleLeaveGroup}
            titleStyle={{ color: hasOutstanding ? theme.textSecondary : theme.warning }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>
      )}

      {isCreator && (
        <Surface style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]} elevation={0}>
          <List.Item
            title="Delete group"
            description="Permanently removes group and all expenses"
            left={props => <List.Icon {...props} icon="delete-outline" color={theme.error} />}
            onPress={handleDeleteGroup}
            titleStyle={{ color: theme.error }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>
      )}

      {/* ── Add Member Modal ─────────────────────────────────────────────── */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>Add Member</Text>
          <View style={[styles.searchBox, { borderColor: theme.border }]}>
            <List.Icon icon="magnify" color={theme.textSecondary} style={{ margin: 0 }} />
            <RNTextInput
              style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: 4 }}
              placeholder="Search by name, email or phone…"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {searching || (friendsLoading && !searchQuery.trim()) ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={searchQuery.trim().length >= 2 ? searchResults : friends}
              keyExtractor={u => u._id}
              ItemSeparatorComponent={() => <Divider />}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={
                <Text variant="bodySmall" style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery.trim().length >= 2 ? 'No users found.' : 'No friends to add yet.'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  {item.profilePic
                    ? <Image source={{ uri: item.profilePic }} style={styles.searchAvatar} />
                    : (
                      <View style={[styles.searchAvatar, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: theme.onPrimary, fontWeight: '700' }}>{item.name[0]}</Text>
                      </View>
                    )}
                  <View style={styles.memberInfo}>
                    <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.textSecondary }}>{item.email}</Text>
                  </View>
                  <Button
                    mode="contained" compact
                    loading={addingId === item._id}
                    disabled={addingId === item._id}
                    onPress={() => handleAddMember(item)}
                    style={{ backgroundColor: theme.primary }}
                  >Add</Button>
                </View>
              )}
            />
          )}
          <Button mode="text" onPress={() => setAddModalVisible(false)} style={{ marginTop: 8 }}>Done</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  sectionTitle: { fontWeight: '700', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', padding: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  memberInfo: { flex: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  settingIcon: { width: 40, alignItems: 'center' },
  searchAvatar: { width: 36, height: 36, borderRadius: 18 },
  emptyText: { textAlign: 'center', paddingVertical: 16 },
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '600', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingRight: 8, marginBottom: 8 },
  proBadge: { backgroundColor: '#E8D5F7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'center' },

  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  photoPicker: {
    width: 64, height: 64, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: 64, height: 64, borderRadius: 12 },
  typeGrid: { flexDirection: 'row', gap: 8 },
  typeCard: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    overflow: 'hidden',
  },
});
