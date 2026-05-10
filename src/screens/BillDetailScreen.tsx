import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, Divider, List, Card, useTheme } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { scheduleBillReminder } from '../utils/notifications';
import { haptics } from '../utils/haptics';
import StatusChip from '../components/StatusChip';

export default function BillDetailScreen({ route, navigation }: any) {
  const { billId } = route.params;
  const { theme } = useAppTheme();
  const paperTheme = useTheme();
  const bills = useStore(state => state.bills);
  const markBillHandled = useStore(state => state.markBillHandled);
  const updateBill = useStore(state => state.updateBill);
  const currency = useStore(state => state.currency);

  const bill = bills.find(b => b.id === billId);

  if (!bill) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text variant="bodyLarge" style={{ color: theme.text }}>Bill not found.</Text>
      </View>
    );
  }

  const handleSnooze = () => {
    haptics.light();
    const snoozedDate = new Date();
    snoozedDate.setDate(snoozedDate.getDate() + 1);
    updateBill(bill.id, { dueDate: snoozedDate.toISOString() });
    scheduleBillReminder(bill.id, bill.title, snoozedDate.toISOString());
    Alert.alert('Snoozed', `Reminder moved to ${snoozedDate.toLocaleDateString()}`);
  };

  const handleMarkHandled = () => {
    haptics.success();
    markBillHandled(bill.id);
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={[styles.heroCard, { backgroundColor: theme.primary }]}>
        <Card.Content style={styles.heroCardContent}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.onPrimary, opacity: 0.75 }}>
            {bill.category}
          </Text>
          <Text variant="displaySmall" style={{ color: paperTheme.colors.onPrimary, fontWeight: '700' }}>
            {formatAmount(bill.amount, currency)}
          </Text>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onPrimary }}>
            {bill.title}
          </Text>
          <StatusChip type={bill.status} compact />
        </Card.Content>
      </Card>

      <Surface
        style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        elevation={0}
      >
        <List.Item
          title="Due Date"
          description={new Date(bill.dueDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          left={props => <List.Icon {...props} icon="calendar" color={theme.primary} />}
          titleStyle={{ color: theme.textSecondary }}
          descriptionStyle={{ color: theme.text }}
        />
        <Divider />
        <List.Item
          title="Recurrence"
          description={bill.isRecurring ? 'Monthly recurring bill' : 'One-time bill'}
          left={props => (
            <List.Icon
              {...props}
              icon={bill.isRecurring ? 'autorenew' : 'minus-circle-outline'}
              color={theme.primary}
            />
          )}
          titleStyle={{ color: theme.textSecondary }}
          descriptionStyle={{ color: theme.text }}
        />
        <Divider />
        <List.Item
          title="Category"
          description={bill.category}
          left={props => <List.Icon {...props} icon="tag-outline" color={theme.primary} />}
          titleStyle={{ color: theme.textSecondary }}
          descriptionStyle={{ color: theme.text }}
        />
      </Surface>

      {bill.status !== 'handled' && (
        <>
          <Button
            mode="contained"
            icon="check-circle-outline"
            onPress={handleMarkHandled}
            style={styles.handleButton}
            contentStyle={styles.handleButtonContent}
          >
            Mark as Handled
          </Button>
          <Button
            mode="outlined"
            icon="snooze"
            onPress={handleSnooze}
            style={styles.handleButton}
            textColor={theme.primary}
          >
            Snooze for 1 day
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    margin: 16,
    borderRadius: 16,
  },
  heroCardContent: {
    gap: 8,
  },
  detailCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  handleButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  handleButtonContent: { paddingVertical: 6 },
});
