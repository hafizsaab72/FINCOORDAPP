import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Divider, Text } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

const getActivityIcon = (action: string) => {
  if (action.includes('Expense')) return 'cash-multiple';
  if (action.includes('Added Bill')) return 'receipt-text-plus';
  if (action.includes('Bill Handled')) return 'check-circle-outline';
  if (action.includes('Group')) return 'account-group-outline';
  return 'clock-outline';
};

const getActivityColor = (action: string) => {
  if (action.includes('Expense')) return '#0F7A5B';
  if (action.includes('Added Bill')) return '#FFAA00';
  if (action.includes('Bill Handled')) return '#0F7A5B';
  if (action.includes('Group')) return '#5C6BC0';
  return '#999';
};

const relativeTime = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function ActivityScreen() {
  const { theme } = useAppTheme();
  const activities = useStore(state => state.activities);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: '#999', textAlign: 'center' }}>
              No activity yet.{'\n'}Actions will appear here automatically.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.action}
            description={item.detail}
            left={props => (
              <List.Icon
                {...props}
                icon={getActivityIcon(item.action)}
                color={getActivityColor(item.action)}
              />
            )}
            right={() => (
              <Text
                variant="bodySmall"
                style={styles.timestamp}
              >
                {relativeTime(item.timestamp)}
              </Text>
            )}
            style={{ backgroundColor: theme.background }}
            titleStyle={{ color: theme.text, fontWeight: '600' }}
            descriptionStyle={{ color: '#888' }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  timestamp: { color: '#999', alignSelf: 'center', marginRight: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
});
