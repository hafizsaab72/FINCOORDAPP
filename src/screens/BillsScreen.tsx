import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, FAB, Divider, Text } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { Bill } from '../types';
import { formatAmount } from '../utils/currency';
import StatusChip from '../components/StatusChip';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';

export default function BillsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const bills = useStore(state => state.bills);
  const currency = useStore(state => state.currency);

  const renderBill = ({ item }: { item: Bill }) => {
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
              {formatAmount(item.amount, currency)}
            </Text>
            <StatusChip type={item.status === 'handled' ? 'handled' : item.status === 'overdue' ? 'overdue' : 'pending'} />
          </View>
        )}
        onPress={() => {
          haptics.light();
          navigation.navigate('BillDetail', { billId: item.id });
        }}
        style={{ backgroundColor: theme.background }}
        titleStyle={{ color: theme.text }}
        descriptionStyle={{ color: theme.textSecondary }}
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
          <EmptyState
            icon="receipt-text-outline"
            title="No bills tracked yet."
            subtitle="Tap + to add your first bill."
            action={{
              label: 'Add Bill',
              onPress: () => navigation.navigate('AddBillModal'),
              icon: 'plus',
            }}
          />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary }]}
        color="#FFF"
        onPress={() => {
          haptics.light();
          navigation.navigate('AddBillModal');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rightContent: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
  amount: { fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});
