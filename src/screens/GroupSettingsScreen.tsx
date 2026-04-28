import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Image, ScrollView, Switch, TextInput } from 'react-native';
import {
  Text, Button, Divider, List, ActivityIndicator,
  Portal, Modal, Icon,
} from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, ApiGroup } from '../services/groupsService';
import { friendsService, FriendUser } from '../services/friendsService';
import { GroupBalancesData, GroupMember } from '../types';
import { getSymbol } from '../utils/currency';

function MemberAvatar({ member, size = 44 }: { member: GroupMember; size?: number }) {
  const { theme } = useAppTheme();
  if (member.profilePic) {
    return <Image source={{ uri: member.profilePic }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: size * 0.4 }}>
        {(member.name?.[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}

export default function GroupSettingsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { theme } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);
  const updateGroup = useStore(state => state.updateGroup);
  const removeGroup = useStore(state => state.removeGroup);
  const symbol = getSymbol(currentUser?.currency ?? 'USD');

  const isLocalGroup = !groupId.match(/^[a-f\d]{24}$/i);

  const [group, setGroup] = useState<ApiGroup | null>(null);
  const [balances, setBalances] = useState<GroupBalancesData | null>(null);
  const [loading, setLoading] = useState(!isLocalGroup);
  const [error, setError] = useState(isLocalGroup ? 'local' : '');

  // Simplify debts toggle
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [togglingSimplify, setTogglingSimplify] = useState(false);

  // Add member
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remove member
  // Remove member state (reserved for future use)
  // const [removingId, setRemovingId] = useState<string | null>(null);

  const isCreator = group?.createdBy?._id === currentUser?.id;
  const myNet = balances ? balances.totalOwedToYou - balances.totalYouOwe : 0;
  const hasOutstanding = Math.abs(myNet) > 0.005;

  useEffect(() => {
    if (!isLocalGroup && currentUser) loadAll();
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
      setSimplifyDebts(g.simplifyDebts ?? true);
    } else {
      setError((groupRes.reason as any)?.message ?? 'Could not load group.');
    }
    if (balancesRes.status === 'fulfilled') setBalances(balancesRes.value);
    setLoading(false);
  };

  // Debounced search
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

  const handleToggleSimplify = async (value: boolean) => {
    setSimplifyDebts(value);
    setTogglingSimplify(true);
    try {
      await groupsService.update(groupId, { simplifyDebts: value });
      updateGroup(groupId, { simplifyDebts: value });
    } catch (e: any) {
      setSimplifyDebts(!value); // revert
      Alert.alert('Error', e.message);
    } finally {
      setTogglingSimplify(false);
    }
  };

  const handleAddMember = async (user: FriendUser) => {
    setAddingId(user._id);
    try {
      const data = await groupsService.addMember(groupId, user._id);
      setGroup(data.group);
      updateGroup(groupId, { members: data.group.members.map(m => m._id) });
      setSearchResults(prev => prev.filter(u => u._id !== user._id));
      setFriends(prev => prev.filter(u => u._id !== user._id));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddingId(null);
    }
  };

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
            await groupsService.removeMember(groupId, currentUser.id);
            removeGroup(groupId);
            navigation.pop(2);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

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
              removeGroup(groupId);
              navigation.pop(2);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  if (!currentUser) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: '#888', textAlign: 'center', marginBottom: 16 }}>
          Sign in to manage group settings.
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate('SignIn')}
          style={{ backgroundColor: theme.primary }}>Sign In</Button>
      </View>
    );
  }

  if (isLocalGroup) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: '#888', textAlign: 'center' }}>
          This group was created offline.{'\n'}Sign in to manage settings.
        </Text>
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
        <Text style={{ color: '#FF3B30', textAlign: 'center', marginBottom: 12 }}>
          {error || 'Group not found.'}
        </Text>
        <Button onPress={loadAll}>Retry</Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.background }]} contentContainerStyle={styles.container}>

      {/* Group members */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Group members</Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {group.members.map((member, idx) => {
          const isMe = member._id === currentUser?.id;
          const memberBalance = balances?.memberBalances.find(b => b.memberId === member._id);
          const net = memberBalance?.net ?? 0;

          return (
            <React.Fragment key={member._id}>
              {idx > 0 && <Divider style={{ marginLeft: 72 }} />}
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
                      <Text style={{ fontSize: 12, color: net > 0 ? '#0F7A5B' : '#E8673A' }}>
                        {net > 0 ? 'gets back' : 'owes'}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: net > 0 ? '#0F7A5B' : '#E8673A' }}>
                        {symbol}{Math.abs(net).toFixed(2)}
                      </Text>
                    </>
                  )}
                  {!isMe && Math.abs(net) <= 0.005 && (
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>settled up</Text>
                  )}
                  {isMe && (
                    <Text style={{ fontSize: 12, color: theme.primary }}>
                      {member._id === group.createdBy?._id ? 'Owner' : 'You'}
                    </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <Button
        mode="text"
        icon="account-plus-outline"
        textColor={theme.primary}
        onPress={() => {
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

      {/* Advanced settings */}
      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Advanced settings</Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Simplify debts */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Icon source="source-branch" size={22} color={theme.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>Simplify group debts</Text>
            <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Automatically combines debts to reduce the total number of repayments between group members. <Text style={{ color: theme.primary }}>Learn more</Text>
            </Text>
          </View>
          <Switch
            value={simplifyDebts}
            onValueChange={handleToggleSimplify}
            trackColor={{ true: theme.primary, false: '#CCC' }}
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
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          onPress={() => navigation.navigate('AccountTab', { screen: 'Upgrade' })}
          titleStyle={{ color: theme.text, fontWeight: '600' }}
          descriptionStyle={{ color: theme.textSecondary }}
        />
      </View>

      {/* Leave group */}
      {!isCreator && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]}>
          <List.Item
            title="Leave group"
            description={hasOutstanding ? "You can't leave this group because you have outstanding debts with other group members." : undefined}
            left={props => <List.Icon {...props} icon="logout" color={hasOutstanding ? theme.textSecondary : '#FF9500'} />}
            onPress={handleLeaveGroup}
            titleStyle={{ color: hasOutstanding ? theme.textSecondary : '#FF9500' }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </View>
      )}

      {/* Danger zone — creator only */}
      {isCreator && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]}>
          <List.Item
            title="Delete group"
            description="Permanently removes group and all expenses"
            left={props => <List.Icon {...props} icon="delete-outline" color="#FF3B30" />}
            onPress={handleDeleteGroup}
            titleStyle={{ color: '#FF3B30' }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </View>
      )}

      {/* Add member modal */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>Add Member</Text>
          <View style={[styles.searchBox, { borderColor: theme.border }]}>
            <List.Icon icon="magnify" color="#888" style={{ margin: 0 }} />
            <TextInput
              style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: 4 }}
              placeholder="Search by name, email or phone…"
              placeholderTextColor="#888"
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
                <Text style={styles.emptyText}>
                  {searchQuery.trim().length >= 2 ? 'No users found.' : 'No friends to add yet.'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  {item.profilePic
                    ? <Image source={{ uri: item.profilePic }} style={styles.searchAvatar} />
                    : (
                      <View style={[styles.searchAvatar, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.name[0]}</Text>
                      </View>
                    )}
                  <View style={styles.memberInfo}>
                    <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>{item.email}</Text>
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
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  memberInfo: { flex: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 40, alignItems: 'center' },
  searchAvatar: { width: 36, height: 36, borderRadius: 18 },
  emptyText: { color: '#999', textAlign: 'center', paddingVertical: 16 },
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '600', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingRight: 8, marginBottom: 8 },
  proBadge: { backgroundColor: '#E8D5F7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'center' },
  proBadgeText: { fontSize: 11, fontWeight: '700', color: '#7B4FA3' },
});
