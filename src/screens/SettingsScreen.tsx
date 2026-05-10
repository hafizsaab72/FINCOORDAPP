import React from 'react';
import { View, StyleSheet, FlatList, Alert, Image, ScrollView } from 'react-native';
import { List, Switch, Button, Divider, Text, Modal, Portal, TouchableRipple, Surface, Snackbar } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';
import { useStore } from '../store/useStore';
import { CURRENCIES } from '../utils/currency';
import { authService } from '../services/authService';
import { exportDataToCSV } from '../utils/exportData';
import { haptics } from '../utils/haptics';

export default function SettingsScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');

  const clearData = useStore(state => state.clearData);
  const currency = useStore(state => state.currency);
  const setCurrency = useStore(state => state.setCurrency);
  const currentUser = useStore(state => state.currentUser);
  const isGuest = useStore(state => state.isGuest);
  const signOut = useStore(state => state.signOut);
  const isPro = useStore(state => state.isPro);
  const expenses = useStore(state => state.expenses);
  const bills = useStore(state => state.bills);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSignOut = () => {
    signOut();
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
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
            if (navigationRef.isReady()) {
              navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }
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
            showSnackbar('All data cleared');
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.scrollRoot, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          APPEARANCE
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Dark Mode"
            description={isDark ? 'Currently dark' : 'Currently light'}
            left={props => (
              <List.Icon {...props} icon={isDark ? 'weather-night' : 'weather-sunny'} color={theme.primary} />
            )}
            right={() => (
              <Switch
                value={isDark}
                onValueChange={() => {
                  haptics.selection();
                  toggleTheme();
                }}
                color={theme.primary}
              />
            )}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          CURRENCY
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Currency"
            description={`${selectedCurrency.symbol} · ${selectedCurrency.name}`}
            left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              setCurrencyModalVisible(true);
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          FINCOORD PRO
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title={isPro ? 'FinCoord Pro · Active' : 'Upgrade to Pro'}
            description={isPro ? 'All features unlocked' : 'Analytics, export, OCR & more'}
            left={props => <List.Icon {...props} icon="crown" color="#FFD700" />}
            right={props => !isPro && <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('Upgrade');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="Analytics"
            description="Spending charts and trends"
            left={props => <List.Icon {...props} icon="chart-bar" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('Analytics');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          {isPro && (
            <>
              <Divider />
              <List.Item
                title="Export Data"
                description="Download expenses & bills as CSV"
                left={props => <List.Icon {...props} icon="file-export-outline" color={theme.primary} />}
                onPress={() => {
                  haptics.success();
                  exportDataToCSV(expenses, bills);
                }}
                titleStyle={{ color: theme.text }}
                descriptionStyle={{ color: theme.textSecondary }}
              />
            </>
          )}
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          BILLS & REMINDERS
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Bills & Reminders"
            description="View upcoming and overdue bills"
            left={props => <List.Icon {...props} icon="receipt-text-outline" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('ActivityTab', { screen: 'Activity' });
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="Add Bill"
            description="Track a new bill or recurring payment"
            left={props => <List.Icon {...props} icon="receipt-text-plus-outline" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('AddBillModal');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="Add Expense"
            description="Log a new shared expense"
            left={props => <List.Icon {...props} icon="cash-plus" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('AddExpenseModal');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="Search"
            description="Search expenses, bills, and groups"
            left={props => <List.Icon {...props} icon="magnify" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('Search');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          FRIENDS
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Friends"
            description="View your friends, requests and contacts"
            left={props => <List.Icon {...props} icon="account-multiple-outline" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('FriendsTab', { screen: 'Friends' });
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="My QR Code"
            description="Share your QR or friend code so others can add you"
            left={props => <List.Icon {...props} icon="qrcode" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              haptics.light();
              navigation.navigate('MyQRCode');
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          NOTIFICATIONS
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Push Notifications"
            description="Bill due date alerts and reminders"
            left={props => <List.Icon {...props} icon="bell-outline" color={theme.primary} />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={(value: boolean) => {
                  haptics.selection();
                  setNotifications(value);
                }}
                color={theme.primary}
              />
            )}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          ACCOUNT
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          {currentUser ? (
            <>
              {/* Profile row — tappable, shows avatar */}
              <TouchableRipple
                onPress={() => {
                  haptics.light();
                  navigation.navigate('Profile');
                }}
              >
                <View style={styles.profileRow}>
                  {currentUser.profilePic ? (
                    <Image source={{ uri: currentUser.profilePic }} style={styles.miniAvatar} />
                  ) : (
                    <View style={[styles.miniAvatar, styles.miniAvatarFallback, { backgroundColor: theme.primary }]}>
                      <Text variant="titleMedium" style={{ color: theme.onPrimary }}>
                        {(currentUser.name?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text variant="titleMedium" style={{ color: theme.text }}>
                      {currentUser.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
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
                left={props => <List.Icon {...props} icon="account-outline" color={theme.textSecondary} />}
                titleStyle={{ color: theme.textSecondary }}
                descriptionStyle={{ color: theme.textSecondary }}
              />
              <Divider />
            </>
          )}

          <List.Item
            title="Clear All Data"
            description="Removes all expenses, bills, and groups"
            left={props => <List.Icon {...props} icon="delete-outline" color={theme.error} />}
            onPress={() => {
              haptics.medium();
              handleClearData();
            }}
            titleStyle={{ color: theme.error }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          {currentUser && (
            <>
              <Divider />
              <List.Item
                title="Delete Account"
                description="Permanently deletes your account and all data"
                left={props => <List.Icon {...props} icon="account-remove-outline" color={theme.error} />}
                onPress={() => {
                  haptics.medium();
                  handleDeleteAccount();
                }}
                titleStyle={{ color: theme.error }}
                descriptionStyle={{ color: theme.textSecondary }}
              />
            </>
          )}
          <Divider />
          {currentUser ? (
            <List.Item
              title="Sign Out"
              left={props => <List.Icon {...props} icon="logout" color={theme.error} />}
              onPress={() => {
                haptics.medium();
                handleSignOut();
              }}
              titleStyle={{ color: theme.error }}
            />
          ) : (
            <List.Item
              title="Sign In / Create Account"
              left={props => <List.Icon {...props} icon="login" color={theme.primary} />}
              onPress={() => {
                haptics.light();
                if (navigationRef.isReady()) {
                  navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                }
              }}
              titleStyle={{ color: theme.primary }}
            />
          )}
        </Surface>

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
                    haptics.selection();
                    setCurrency(item.code);
                    setCurrencyModalVisible(false);
                    if (currentUser) {
                      authService.updateProfile({ currency: item.code }).catch(() => {});
                    }
                    showSnackbar('Currency updated');
                  }}
                >
                  <View style={styles.currencyRow}>
                    <View style={styles.currencyInfo}>
                      <Text variant="bodyLarge" style={{ color: theme.text }}>
                        {item.symbol}{'  '}{item.code}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                        {item.name}
                      </Text>
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
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  sectionLabel: { marginBottom: 8, marginTop: 16 },
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
  modal: { marginHorizontal: 24, borderRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  modalTitle: { padding: 20, paddingBottom: 12 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  currencyInfo: { flex: 1 },
  modalCancel: { margin: 8 },
});
