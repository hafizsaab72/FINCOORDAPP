import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Button, Divider, Text } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = React.useState(true);
  const clearData = useStore(state => state.clearData);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text
        variant="titleMedium"
        style={[styles.sectionLabel, { color: '#888' }]}
      >
        APPEARANCE
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Dark Mode"
          description={isDark ? 'Currently dark' : 'Currently light'}
          left={props => (
            <List.Icon
              {...props}
              icon={isDark ? 'weather-night' : 'weather-sunny'}
              color={theme.primary}
            />
          )}
          right={() => (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              color={theme.primary}
            />
          )}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: '#888' }}
        />
      </View>

      <Text
        variant="titleMedium"
        style={[styles.sectionLabel, { color: '#888' }]}
      >
        NOTIFICATIONS
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Push Notifications"
          description="Bill due date alerts and reminders"
          left={props => (
            <List.Icon {...props} icon="bell-outline" color={theme.primary} />
          )}
          right={() => (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              color={theme.primary}
            />
          )}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: '#888' }}
        />
      </View>

      <Text
        variant="titleMedium"
        style={[styles.sectionLabel, { color: '#888' }]}
      >
        ACCOUNT
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <List.Item
          title="Clear All Data"
          description="Removes all expenses, bills, and groups"
          left={props => (
            <List.Icon {...props} icon="delete-outline" color="#FF3B30" />
          )}
          onPress={clearData}
          titleStyle={{ color: '#FF3B30' }}
          descriptionStyle={{ color: '#888' }}
        />
        <Divider />
        <List.Item
          title="Sign Out"
          left={props => (
            <List.Icon {...props} icon="logout" color="#FF3B30" />
          )}
          onPress={() => {}}
          titleStyle={{ color: '#FF3B30' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 16,
    fontSize: 11,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
