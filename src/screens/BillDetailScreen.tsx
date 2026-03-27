import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Button, Chip, Divider, List } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';

const STATUS_CONFIG = {
  pending: { color: '#FFAA00', icon: 'clock-outline' },
  overdue: { color: '#FF3B30', icon: 'alert-circle-outline' },
  handled: { color: '#0F7A5B', icon: 'check-circle-outline' },
};

export default function BillDetailScreen({ route, navigation }: any) {
  const { billId } = route.params;
  const { theme } = useAppTheme();
  const bills = useStore(state => state.bills);
  const markBillHandled = useStore(state => state.markBillHandled);
  const currency = useStore(state => state.currency);

  const bill = bills.find(b => b.id === billId);

  if (!bill) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Bill not found.</Text>
      </View>
    );
  }

  const config = STATUS_CONFIG[bill.status];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface
        style={[styles.heroCard, { backgroundColor: theme.primary }]}
        elevation={2}
      >
        <Text variant="labelLarge" style={styles.heroLabel}>
          {bill.category}
        </Text>
        <Text variant="displaySmall" style={styles.heroAmount}>
          {formatAmount(bill.amount, currency)}
        </Text>
        <Text variant="titleMedium" style={styles.heroTitle}>
          {bill.title}
        </Text>
        <Chip
          mode="flat"
          icon={config.icon}
          style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          textStyle={{ color: '#FFF' }}
        >
          {bill.status.toUpperCase()}
        </Chip>
      </Surface>

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
          titleStyle={{ color: '#888' }}
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
          titleStyle={{ color: '#888' }}
          descriptionStyle={{ color: theme.text }}
        />
        <Divider />
        <List.Item
          title="Category"
          description={bill.category}
          left={props => <List.Icon {...props} icon="tag-outline" color={theme.primary} />}
          titleStyle={{ color: '#888' }}
          descriptionStyle={{ color: theme.text }}
        />
      </Surface>

      {bill.status !== 'handled' && (
        <Button
          mode="contained"
          icon="check-circle-outline"
          onPress={() => {
            markBillHandled(bill.id);
            navigation.goBack();
          }}
          style={styles.handleButton}
          contentStyle={styles.handleButtonContent}
        >
          Mark as Handled
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    gap: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.75)' },
  heroAmount: { color: '#FFF', fontWeight: 'bold' },
  heroTitle: { color: '#FFF' },
  heroChip: { alignSelf: 'flex-start', marginTop: 4 },
  detailCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  handleButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 10,
  },
  handleButtonContent: { paddingVertical: 6 },
});
