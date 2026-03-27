import React from 'react';
import { View, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { List, Switch, Button, Divider, Text, Modal, Portal, TouchableRipple } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { CURRENCIES } from '../utils/currency';
import { authService } from '../services/authService';

export default function SettingsScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);

  const clearData = useStore(state => state.clearData);
  const currency = useStore(state => state.currency);
  const setCurrency = useStore(state => state.setCurrency);
  const currentUser = useStore(state => state.currentUser);
  const isGuest = useStore(state => state.isGuest);
  const signOut = useStore(state => state.signOut);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  const handleSignOut = () => {
    signOut();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and ALL your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deleteAccount();
            } catch {
              // proceed with local cleanup even if API fails
            }
            clearData();
            signOut();
            navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          },
        },
      ],
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses, bills, groups, and activity. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (currentUser) {
              // Logged-in: clear from MongoDB too
              try {
                await authService.clearAllData();
              } catch {
                // still clear locally even if API fails
              }
            }
            clearData();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text variant="titleMedium" style={[styles.sectionLabel, { color: '#888' }]}>
        APPEARANCE
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Dark Mode"
          description={isDark ? 'Currently dark' : 'Currently light'}
          left={props => (
            <List.Icon {...props} icon={isDark ? 'weather-night' : 'weather-sunny'} color={theme.primary} />
          )}
          right={() => <Switch value={isDark} onValueChange={toggleTheme} color={theme.primary} />}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: '#888' }}
        />
      </View>

      <Text variant="titleMedium" style={[styles.sectionLabel, { color: '#888' }]}>
        CURRENCY
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Currency"
          description={`${selectedCurrency.symbol} · ${selectedCurrency.name}`}
          left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setCurrencyModalVisible(true)}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: '#888' }}
        />
      </View>

      <Text variant="titleMedium" style={[styles.sectionLabel, { color: '#888' }]}>
        NOTIFICATIONS
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Push Notifications"
          description="Bill due date alerts and reminders"
          left={props => <List.Icon {...props} icon="bell-outline" color={theme.primary} />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} color={theme.primary} />
          )}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: '#888' }}
        />
      </View>

      <Text variant="titleMedium" style={[styles.sectionLabel, { color: '#888' }]}>
        ACCOUNT
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {currentUser ? (
          <>
            {/* Profile row — tappable, shows avatar */}
            <TouchableRipple onPress={() => navigation.getParent()?.navigate('Profile')}>
              <View style={styles.profileRow}>
                {currentUser.profilePic ? (
                  <Image source={{ uri: currentUser.profilePic }} style={styles.miniAvatar} />
                ) : (
                  <View style={[styles.miniAvatar, styles.miniAvatarFallback, { backgroundColor: theme.primary }]}>
                    <Text style={styles.miniAvatarText}>
                      {currentUser.name[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text variant="bodyLarge" style={{ color: theme.text, fontWeight: '600' }}>
                    {currentUser.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>
                    {currentUser.email}
                  </Text>
                </View>
                <List.Icon icon="chevron-right" />
              </View>
            </TouchableRipple>
            <Divider />
          </>
        ) : (
          <>
            <List.Item
              title={isGuest ? 'Guest Mode' : 'Not signed in'}
              description={isGuest ? 'Sign in to sync your data' : ''}
              left={props => <List.Icon {...props} icon="account-outline" color="#888" />}
              titleStyle={{ color: '#888' }}
              descriptionStyle={{ color: '#aaa' }}
            />
            <Divider />
          </>
        )}

        <List.Item
          title="Clear All Data"
          description="Removes all expenses, bills, and groups"
          left={props => <List.Icon {...props} icon="delete-outline" color="#FF3B30" />}
          onPress={handleClearData}
          titleStyle={{ color: '#FF3B30' }}
          descriptionStyle={{ color: '#888' }}
        />
        {currentUser && (
          <>
            <Divider />
            <List.Item
              title="Delete Account"
              description="Permanently deletes your account and all data"
              left={props => <List.Icon {...props} icon="account-remove-outline" color="#FF3B30" />}
              onPress={handleDeleteAccount}
              titleStyle={{ color: '#FF3B30' }}
              descriptionStyle={{ color: '#888' }}
            />
          </>
        )}
        <Divider />
        <List.Item
          title={currentUser || isGuest ? 'Sign Out' : 'Sign In'}
          left={props => (
            <List.Icon {...props} icon={currentUser || isGuest ? 'logout' : 'login'} color="#FF3B30" />
          )}
          onPress={handleSignOut}
          titleStyle={{ color: '#FF3B30' }}
        />
      </View>

      <Portal>
        <Modal
          visible={currencyModalVisible}
          onDismiss={() => setCurrencyModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>
            Select Currency
          </Text>
          <FlatList
            data={CURRENCIES}
            keyExtractor={item => item.code}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <TouchableRipple
                onPress={() => {
                  setCurrency(item.code);
                  setCurrencyModalVisible(false);
                  if (currentUser) {
                    authService.updateProfile({ currency: item.code }).catch(() => {});
                  }
                }}
              >
                <View style={styles.currencyRow}>
                  <View style={styles.currencyInfo}>
                    <Text variant="bodyLarge" style={{ color: theme.text }}>
                      {item.symbol}{'  '}{item.code}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>{item.name}</Text>
                  </View>
                  {item.code === currency && (
                    <List.Icon icon="check-circle" color={theme.primary} />
                  )}
                </View>
              </TouchableRipple>
            )}
          />
          <Button mode="text" onPress={() => setCurrencyModalVisible(false)} style={styles.modalCancel}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionLabel: { marginBottom: 8, marginTop: 16, fontSize: 11, letterSpacing: 1 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  profileInfo: { flex: 1 },
  miniAvatar: { width: 44, height: 44, borderRadius: 22 },
  miniAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  modal: { marginHorizontal: 24, borderRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  modalTitle: { padding: 20, paddingBottom: 12, fontWeight: '600' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  currencyInfo: { flex: 1 },
  modalCancel: { margin: 8 },
});
