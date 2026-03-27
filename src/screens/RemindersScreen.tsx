import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Button, Chip, Divider, Text } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

export default function RemindersScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const { bills, markBillHandled } = useStore(state => ({
    bills: state.bills,
    markBillHandled: state.markBillHandled,
  }));

  const pending = bills.filter(b => b.status === 'pending');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {pending.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyLarge" style={{ color: '#999', textAlign: 'center' }}>
            All clear! No pending reminders.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => {
            const overdue = isOverdue(item.dueDate);
            const chipColor = overdue ? '#FF3B30' : '#FFAA00';
            const chipIcon = overdue ? 'alert-circle-outline' : 'clock-outline';

            return (
              <List.Item
                title={item.title}
                description={`Due: ${new Date(item.dueDate).toLocaleDateString()} · $${item.amount.toFixed(2)}`}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={overdue ? 'bell-alert' : 'bell-outline'}
                    color={chipColor}
                  />
                )}
                right={() => (
                  <View style={styles.actions}>
                    <Chip
                      compact
                      mode="outlined"
                      icon={chipIcon}
                      textStyle={{ color: chipColor, fontSize: 10 }}
                      style={{ borderColor: chipColor }}
                    >
                      {overdue ? 'overdue' : 'pending'}
                    </Chip>
                    <Button
                      mode="text"
                      compact
                      icon="check"
                      textColor={theme.primary}
                      onPress={() => markBillHandled(item.id)}
                    >
                      Done
                    </Button>
                  </View>
                )}
                onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
                style={{ backgroundColor: theme.background }}
                titleStyle={{ color: theme.text }}
                descriptionStyle={{ color: '#888' }}
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
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  actions: { justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginRight: 4 },
});
