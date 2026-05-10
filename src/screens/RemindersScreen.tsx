import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Button, Divider } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import StatusChip from '../components/StatusChip';
import EmptyState from '../components/EmptyState';
import { haptics } from '../utils/haptics';

const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

export default function RemindersScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const bills = useStore(state => state.bills);
  const markBillHandled = useStore(state => state.markBillHandled);
  const currency = useStore(state => state.currency);

  const pending = bills.filter(b => b.status === 'pending');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {pending.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title="All clear!"
          subtitle="No pending reminders."
        />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => {
            const overdue = isOverdue(item.dueDate);

            return (
              <List.Item
                title={item.title}
                description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · ${formatAmount(item.amount, currency)}`}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={overdue ? 'bell-alert' : 'bell-outline'}
                    color={overdue ? theme.error : theme.warning}
                  />
                )}
                right={() => (
                  <View style={styles.actions}>
                    <StatusChip type={overdue ? 'overdue' : 'pending'} />
                    <Button
                      mode="text"
                      compact
                      icon="check"
                      textColor={theme.primary}
                      onPress={() => {
                        haptics.success();
                        markBillHandled(item.id);
                      }}
                    >
                      Done
                    </Button>
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
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
});
