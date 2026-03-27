import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, FAB, Chip, Divider, Text } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { Bill } from '../types';

const STATUS_CONFIG = {
  pending: { color: '#FFAA00', icon: 'clock-outline' },
  overdue: { color: '#FF3B30', icon: 'alert-circle-outline' },
  handled: { color: '#0F7A5B', icon: 'check-circle-outline' },
};

export default function BillsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const bills = useStore(state => state.bills);

  const renderBill = ({ item }: { item: Bill }) => {
    const config = STATUS_CONFIG[item.status];
    return (
      <List.Item
        title={item.title}
        description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${item.category}${item.isRecurring ? ' · Recurring' : ''}`}
        left={props => (
          <List.Icon {...props} icon="receipt-text-outline" color={theme.primary} />
        )}
        right={() => (
          <View style={styles.rightContent}>
            <Text variant="titleSmall" style={[styles.amount, { color: theme.text }]}>
              ${item.amount.toFixed(2)}
            </Text>
            <Chip
              compact
              mode="outlined"
              icon={config.icon}
              textStyle={{ color: config.color, fontSize: 10 }}
              style={[styles.chip, { borderColor: config.color }]}
            >
              {item.status}
            </Chip>
          </View>
        )}
        onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
        style={{ backgroundColor: theme.background }}
        titleStyle={{ color: theme.text }}
        descriptionStyle={{ color: '#888' }}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={bills}
        keyExtractor={item => item.id}
        renderItem={renderBill}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: '#999', textAlign: 'center' }}>
              No bills tracked yet.{'\n'}Tap + to add your first bill.
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary }]}
        color="#FFF"
        onPress={() => navigation.navigate('AddBillModal')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rightContent: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  amount: { fontWeight: '600' },
  chip: { height: 24 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});
