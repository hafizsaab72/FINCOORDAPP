import React from 'react';
import { View, StyleSheet, FlatList, Alert, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLASSIC_TAB_BAR_FLOAT_OFFSET } from '../constants/tabBar';
import { List, Switch, Button, Divider, Text, Modal, Portal, TouchableRipple, Surface, Snackbar, IconButton, Icon } from 'react-native-paper';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';
import { useStore } from '../store/useStore';
import { CURRENCIES } from '../utils/currency';
import { authService } from '../services/authService';
import { queryClient } from '../../App';
import { exportDataToCSV } from '../utils/exportData';
import { expensesService } from '../services/expensesService';
import { haptics } from '../utils/haptics';
import { colors as staticColors } from '../theme/tokens';

export default function SettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [signOutModalVisible, setSignOutModalVisible] = React.useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = React.useState(false);
  const [clearDataModalVisible, setClearDataModalVisible] = React.useState(false);

  const currency = useStore(state => state.currency);
  const setCurrency = useStore(state => state.setCurrency);
  const currentUser = useStore(state => state.currentUser);
  const signOut = useStore(state => state.signOut);
  const isPro = useStore(state => state.isPro);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  const insets = useSafeAreaInsets();

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSignOut = () => {
    haptics.medium();
    setSignOutModalVisible(true);
  };

  const confirmSignOut = () => {
    queryClient.clear();
    signOut();
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
    setSignOutModalVisible(false);
  };

  const handleDeleteAccount = () => {
    setDeleteAccountModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await authService.deleteAccount();
    } catch {
      // proceed with local cleanup even if API fails
    }
    queryClient.clear();
    signOut();
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
    setDeleteAccountModalVisible(false);
  };

  const handleClearData = () => {
    setClearDataModalVisible(true);
  };

  const confirmClearData = async () => {
    if (currentUser) {
      try {
        await authService.clearAllData();
      } catch {
        // still clear locally even if API fails
      }
    }
    queryClient.clear();
    showSnackbar('All data cleared');
    setClearDataModalVisible(false);
  };

  return (
    <View style={[styles.scrollRoot, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}>
        {/* ── Profile Card ── */}
        <TouchableRipple
          onPress={() => {
            if (currentUser) {
              haptics.light();
              navigation.navigate('Profile');
            }
          }}
          style={[styles.profileCard, { borderColor: theme.border }]}
        >
          <View style={styles.profileRow}>
            {currentUser?.profilePic ? (
              <Image source={{ uri: currentUser.profilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
                <Text variant="titleMedium" style={{ color: theme.onPrimary }}>
                  {(currentUser?.name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text variant="titleMedium" style={{ color: theme.text }}>
                {currentUser?.name ?? 'Not signed in'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                {currentUser?.email ?? ''}
              </Text>
            </View>
            {currentUser && <List.Icon icon="chevron-right" color={theme.textSecondary} />}
          </View>
        </TouchableRipple>

        {/* ── Activity ── */}
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          ACTIVITY
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Activity History"
            description="View all your recent activity"
            left={props => <List.Icon {...props} icon="clock-outline" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.textSecondary} />}
            onPress={() => {
              haptics.light();
              navigation.navigate('AccountTab', { screen: 'Activity' });
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
          <List.Item
            title="Analytics"
            description="Spending insights and charts"
            left={props => <List.Icon {...props} icon="chart-bar" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.textSecondary} />}
            onPress={() => {
              haptics.light();
              navigation.navigate('AccountTab', { screen: 'Analytics' });
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        {/* ── Friends ── */}
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          FRIENDS
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title="Friends"
            description="Manage your friends and balances"
            left={props => <List.Icon {...props} icon="account-group-outline" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.textSecondary} />}
            onPress={() => {
              haptics.light();
              navigation.navigate('FriendsTab', { screen: 'Friends' });
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </Surface>

        {/* ── Preferences ── */}
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          PREFERENCES
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
          <Divider />
          <List.Item
            title="Currency"
            description={`${selectedCurrency.symbol} · ${selectedCurrency.name}`}
            left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.textSecondary} />}
            onPress={() => {
              haptics.light();
              setCurrencyModalVisible(true);
            }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
          <Divider />
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

        {/* ── OnTheTab Pro ── */}
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          FINCOORD PRO
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
          <List.Item
            title={isPro ? 'OnTheTab Pro · Active' : 'Upgrade to Pro'}
            description={isPro ? 'All features unlocked' : 'Analytics, export, OCR & more'}
            left={props => <List.Icon {...props} icon="crown" color="#FFD700" />}
            right={props => !isPro && <List.Icon {...props} icon="chevron-right" color={theme.textSecondary} />}
            onPress={() => {
              haptics.light();
              navigation.navigate('AccountTab', { screen: 'Upgrade' });
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
                onPress={async () => {
                  haptics.success();
                  try {
                    const res = await expensesService.getAll(200);
                    const expenses = (res.expenses || []).map((e: any) => ({
                      date: e.date,
                      title: e.title,
                      totalAmount: e.totalAmount,
                      currency: e.currency,
                      category: e.category,
                      groupId: e.groupId,
                      splitMethod: e.splitMethod,
                    }));
                    exportDataToCSV(expenses as any);
                  } catch {
                    Alert.alert('Export Failed', 'Could not fetch data. Please check your connection and try again.');
                  }
                }}
                titleStyle={{ color: theme.text }}
                descriptionStyle={{ color: theme.textSecondary }}
              />
            </>
          )}
        </Surface>

        {/* ── Data & Privacy ── */}
        <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DATA & PRIVACY
        </Text>
        <Surface elevation={0} style={[styles.card, { borderColor: theme.border }]}>
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
        </Surface>

        {/* ── Sign Out / Sign In ── */}
        <View style={{ marginTop: 24, marginBottom: 16 }}>
          {currentUser ? (
            <Button
              mode="outlined"
              onPress={handleSignOut}
              textColor={theme.error}
              style={[styles.signOutBtn, { borderColor: theme.error }]}
              labelStyle={{ fontWeight: '700' }}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => {
                haptics.light();
                if (navigationRef.isReady()) {
                  navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                }
              }}
              buttonColor={theme.primary}
              textColor={theme.onPrimary}
              style={styles.signOutBtn}
              labelStyle={{ fontWeight: '700' }}
            >
              Sign In / Create Account
            </Button>
          )}
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

        {/* ── Sign Out Modal ── */}
        <Portal>
          <Modal
            visible={signOutModalVisible}
            onDismiss={() => setSignOutModalVisible(false)}
            contentContainerStyle={[styles.confirmModal, { backgroundColor: theme.surface }]}
          >
            <View style={styles.confirmModalHeader}>
              <View style={[styles.confirmModalIcon, { backgroundColor: theme.error + '20' }]}>
                <Icon source="logout" size={28} color={theme.error} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700', marginTop: 16 }}>
                Sign Out?
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                This will sign you out and clear all local data from this device. Your account data remains safe online.
              </Text>
            </View>
            <View style={styles.confirmModalActions}>
              <Button
                mode="outlined"
                onPress={() => setSignOutModalVisible(false)}
                style={[styles.confirmModalBtn, { borderColor: theme.border }]}
                labelStyle={{ color: theme.text }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmSignOut}
                buttonColor={theme.error}
                textColor="#FFFFFF"
                style={styles.confirmModalBtn}
              >
                Sign Out
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ── Delete Account Modal ── */}
        <Portal>
          <Modal
            visible={deleteAccountModalVisible}
            onDismiss={() => setDeleteAccountModalVisible(false)}
            contentContainerStyle={[styles.confirmModal, { backgroundColor: theme.surface }]}
          >
            <View style={styles.confirmModalHeader}>
              <View style={[styles.confirmModalIcon, { backgroundColor: theme.error + '20' }]}>
                <Icon source="account-remove" size={28} color={theme.error} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700', marginTop: 16 }}>
                Delete Account?
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                This will permanently delete your account and ALL your data. This action cannot be undone.
              </Text>
            </View>
            <View style={styles.confirmModalActions}>
              <Button
                mode="outlined"
                onPress={() => setDeleteAccountModalVisible(false)}
                style={[styles.confirmModalBtn, { borderColor: theme.border }]}
                labelStyle={{ color: theme.text }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmDeleteAccount}
                buttonColor={theme.error}
                textColor="#FFFFFF"
                style={styles.confirmModalBtn}
              >
                Delete Forever
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* ── Clear Data Modal ── */}
        <Portal>
          <Modal
            visible={clearDataModalVisible}
            onDismiss={() => setClearDataModalVisible(false)}
            contentContainerStyle={[styles.confirmModal, { backgroundColor: theme.surface }]}
          >
            <View style={styles.confirmModalHeader}>
              <View style={[styles.confirmModalIcon, { backgroundColor: theme.error + '20' }]}>
                <Icon source="delete-alert-outline" size={28} color={theme.error} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.text, fontWeight: '700', marginTop: 16 }}>
                Clear All Data?
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                This will permanently delete all your expenses, bills, groups, and activity. This action cannot be undone.
              </Text>
            </View>
            <View style={styles.confirmModalActions}>
              <Button
                mode="outlined"
                onPress={() => setClearDataModalVisible(false)}
                style={[styles.confirmModalBtn, { borderColor: theme.border }]}
                labelStyle={{ color: theme.text }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmClearData}
                buttonColor={theme.error}
                textColor="#FFFFFF"
                style={styles.confirmModalBtn}
              >
                Clear All
              </Button>
            </View>
          </Modal>
        </Portal>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ bottom: insets.bottom + CLASSIC_TAB_BAR_FLOAT_OFFSET }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { padding: 16, paddingBottom: 100 },
  sectionLabel: { marginBottom: 8, marginTop: 20 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  profileInfo: { flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  signOutBtn: { borderRadius: 12, paddingVertical: 6 },
  modal: { marginHorizontal: 24, borderRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  modalTitle: { padding: 20, paddingBottom: 12 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  currencyInfo: { flex: 1 },
  modalCancel: { margin: 8 },
  confirmModal: { marginHorizontal: 32, borderRadius: 20, padding: 24 },
  confirmModalHeader: { alignItems: 'center' },
  confirmModalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  confirmModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  confirmModalBtn: { flex: 1, borderRadius: 12 },
});
