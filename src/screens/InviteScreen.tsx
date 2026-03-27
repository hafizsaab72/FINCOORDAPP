import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { friendsService, FriendUser } from '../services/friendsService';

export default function InviteScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const currentUser = useStore(state => state.currentUser);

  const refUserId: string | undefined = route.params?.ref;

  const [inviter, setInviter] = useState<FriendUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!refUserId) { setLoading(false); return; }
    friendsService.getInviteUser(refUserId)
      .then(d => setInviter(d.user))
      .catch(() => setError('Could not load user info.'))
      .finally(() => setLoading(false));
  }, [refUserId]);

  const handleAddFriend = async () => {
    if (!currentUser) {
      navigation.navigate('SignIn');
      return;
    }
    if (!refUserId) return;
    setSending(true);
    try {
      await friendsService.sendRequest(refUserId);
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator color={theme.primary} size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : inviter ? (
        <>
          {inviter.profilePic ? (
            <Image source={{ uri: inviter.profilePic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>{inviter.name[0].toUpperCase()}</Text>
            </View>
          )}
          <Text variant="headlineSmall" style={[styles.name, { color: theme.text }]}>
            {inviter.name}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            invited you to connect on FinCoord
          </Text>

          {done ? (
            <Text style={[styles.successText, { color: theme.primary }]}>
              Friend request sent!
            </Text>
          ) : (
            <Button
              mode="contained"
              loading={sending}
              disabled={sending}
              onPress={handleAddFriend}
              style={[styles.btn, { backgroundColor: theme.primary }]}
              contentStyle={styles.btnContent}
            >
              {currentUser ? 'Add Friend' : 'Sign in to Add Friend'}
            </Button>
          )}

          <Button mode="text" onPress={() => navigation.navigate('MainTabs')} style={{ marginTop: 8 }}>
            Go to App
          </Button>
        </>
      ) : (
        <Text style={styles.errorText}>Invalid invite link.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarInitial: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  name: { fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#888', marginBottom: 28, textAlign: 'center' },
  btn: { borderRadius: 10, width: '100%' },
  btnContent: { paddingVertical: 6 },
  successText: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  errorText: { color: '#FF3B30', textAlign: 'center' },
});
