import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Image, Share, Linking, Alert,
} from 'react-native';
import {
  Text, TextInput, Button, Divider, ActivityIndicator,
  TouchableRipple, Chip, Portal, Modal,
} from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { friendsService, FriendUser, FriendRequest } from '../services/friendsService';

type Tab = 'friends' | 'requests';

function Avatar({ user, size = 44 }: { user: FriendUser; size?: number }) {
  const { theme } = useAppTheme();
  if (user.profilePic) {
    return <Image source={{ uri: user.profilePic }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: size * 0.4 }}>
        {user.name[0].toUpperCase()}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { theme } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);

  const [tab, setTab] = useState<Tab>('friends');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [f, r] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getRequests(),
      ]);
      setFriends(f.friends);
      setRequests(r.requests);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
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

  const markBusy = (id: string) => setActionIds(s => new Set(s).add(id));
  const unmarkBusy = (id: string) => setActionIds(s => { const n = new Set(s); n.delete(id); return n; });

  const sendRequest = async (userId: string) => {
    markBusy(userId);
    try {
      await friendsService.sendRequest(userId);
      setSearchResults(prev => prev.filter(u => u._id !== userId));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { unmarkBusy(userId); }
  };

  const accept = async (req: FriendRequest) => {
    markBusy(req._id);
    try {
      await friendsService.accept(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
      setFriends(prev => [req.sender, ...prev]);
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
        },
      },
    ]);
  };

  const inviteLink = `fincoord://invite?ref=${currentUser?.id}`;
  const inviteText = `Hey! I'm using FinCoord to track shared expenses. Add me as a friend: ${inviteLink}`;

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

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          placeholder="Search by name or email…"
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" />}
          right={query ? <TextInput.Icon icon="close" onPress={() => setQuery('')} /> : undefined}
          style={styles.searchInput}
          dense
        />
        <Button
          mode="contained"
          compact
          icon="account-plus-outline"
          onPress={() => setShareModalVisible(true)}
          style={[styles.inviteBtn, { backgroundColor: theme.primary }]}
        >
          Invite
        </Button>
      </View>

      {/* Search results */}
      {(query.trim().length >= 2) ? (
        searching ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
        ) : searchResults.length === 0 ? (
          <Text style={styles.emptyText}>No users found.</Text>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={u => u._id}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: theme.surface }]}>
                <Avatar user={item} />
                <View style={styles.rowInfo}>
                  <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{item.email}</Text>
                </View>
                <Button
                  mode="contained"
                  compact
                  loading={actionIds.has(item._id)}
                  disabled={actionIds.has(item._id)}
                  onPress={() => sendRequest(item._id)}
                  style={{ backgroundColor: theme.primary }}
                >
                  Add
                </Button>
              </View>
            )}
          />
        )
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableRipple style={styles.tabBtn} onPress={() => setTab('friends')}>
              <Text style={[styles.tabLabel, tab === 'friends' && { color: theme.primary, fontWeight: '700' }]}>
                Friends ({friends.length})
              </Text>
            </TouchableRipple>
            <TouchableRipple style={styles.tabBtn} onPress={() => setTab('requests')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tabLabel, tab === 'requests' && { color: theme.primary, fontWeight: '700' }]}>
                  Requests
                </Text>
                {requests.length > 0 && (
                  <Chip compact style={{ backgroundColor: theme.primary, height: 20 }}
                    textStyle={{ color: '#FFF', fontSize: 10 }}>
                    {requests.length}
                  </Chip>
                )}
              </View>
            </TouchableRipple>
          </View>
          <Divider />

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
          ) : tab === 'friends' ? (
            <FlatList
              data={friends}
              keyExtractor={f => f._id}
              ItemSeparatorComponent={() => <Divider />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No friends yet. Search above or invite someone.</Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.row, { backgroundColor: theme.surface }]}>
                  <Avatar user={item} />
                  <View style={styles.rowInfo}>
                    <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>{item.email}</Text>
                  </View>
                  <Button
                    mode="text"
                    compact
                    textColor="#FF3B30"
                    onPress={() => removeFriend(item._id)}
                  >
                    Remove
                  </Button>
                </View>
              )}
            />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={r => r._id}
              ItemSeparatorComponent={() => <Divider />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No pending friend requests.</Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.row, { backgroundColor: theme.surface }]}>
                  <Avatar user={item.sender} />
                  <View style={styles.rowInfo}>
                    <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>{item.sender.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>{item.sender.email}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Button mode="contained" compact
                      loading={actionIds.has(item._id)}
                      disabled={actionIds.has(item._id)}
                      onPress={() => accept(item)}
                      style={{ backgroundColor: theme.primary }}>
                      Accept
                    </Button>
                    <Button mode="text" compact textColor="#FF3B30"
                      onPress={() => reject(item)}>
                      Decline
                    </Button>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Invite modal */}
      <Portal>
        <Modal
          visible={shareModalVisible}
          onDismiss={() => setShareModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>
            Invite a Friend
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
            style={styles.shareBtn}
            contentStyle={styles.shareBtnContent}>
            More options…
          </Button>
          <Button mode="text" onPress={() => setShareModalVisible(false)}>Cancel</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  searchInput: { flex: 1 },
  inviteBtn: { borderRadius: 8 },
  tabRow: { flexDirection: 'row' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 14, color: '#888' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  rowInfo: { flex: 1 },
  requestActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  emptyText: { color: '#999', textAlign: 'center', padding: 40 },
  modal: { marginHorizontal: 24, borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '600', marginBottom: 8 },
  modalLink: { color: '#888', marginBottom: 20, fontSize: 11 },
  shareBtn: { marginBottom: 10, borderRadius: 10 },
  shareBtnContent: { paddingVertical: 4 },
});
