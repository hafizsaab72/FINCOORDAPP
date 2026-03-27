import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Surface, FAB, Divider, List, Icon } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const { theme } = useAppTheme();
  const allExpenses = useStore(state => state.expenses);
  const expenses = allExpenses.filter(e => e.groupId === groupId);
  const currency = useStore(state => state.currency);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface
        style={[styles.balanceCard, { backgroundColor: theme.primary }]}
        elevation={2}
      >
        <Text variant="labelMedium" style={styles.balanceLabel}>
          {groupName || 'Group'} · Total Expenses
        </Text>
        <Text variant="displaySmall" style={styles.balanceAmount}>
          {formatAmount(totalExpenses, currency)}
        </Text>
        <View style={styles.balanceFooter}>
          <Icon source="chart-bar" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.balanceFooterText}>
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </Surface>

      <Text
        variant="titleSmall"
        style={[styles.sectionTitle, { color: theme.text }]}
      >
        Transactions
      </Text>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No expenses yet. Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.notes || 'Expense'}
            description={`${new Date(item.date).toLocaleDateString()} · ${item.splitMethod} split`}
            left={props => (
              <List.Icon {...props} icon="cash-multiple" color={theme.primary} />
            )}
            right={() => (
              <Text variant="titleSmall" style={[styles.amount, { color: theme.text }]}>
                {formatAmount(item.amount, currency)}
              </Text>
            )}
            style={{ backgroundColor: theme.background }}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: '#888' }}
          />
        )}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary }]}
        color="#FFF"
        onPress={() =>
          navigation.navigate('AddExpenseModal', { groupId })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceAmount: { color: '#FFF', fontWeight: 'bold' },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  balanceFooterText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  amount: { alignSelf: 'center', fontWeight: '600', marginRight: 8 },
  emptyText: { color: '#999', textAlign: 'center', padding: 32 },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});
