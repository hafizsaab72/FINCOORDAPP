import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Surface, FAB, Divider, List, Icon, Menu, IconButton, Portal, Modal, Button, RadioButton } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { SplitMethod } from '../types';

const SPLIT_OPTIONS: { label: string; value: SplitMethod }[] = [
  { label: 'Equal split', value: 'equal' },
  { label: 'Percentage split', value: 'percentage' },
  { label: 'Custom amounts', value: 'custom' },
];

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const { theme } = useAppTheme();
  const allExpenses = useStore(state => state.expenses);
  const expenses = allExpenses.filter(e => e.groupId === groupId);
  const currency = useStore(state => state.currency);
  const setSplitTemplate = useStore(state => state.setSplitTemplate);
  const splitTemplates = useStore(state => state.splitTemplates);

  const [menuVisible, setMenuVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<SplitMethod>(
    splitTemplates[groupId]?.method ?? 'equal',
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSaveTemplate = () => {
    setSplitTemplate({ groupId, method: selectedMethod, details: {} });
    setTemplateModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Surface style={[styles.balanceCard, { backgroundColor: theme.primary }]} elevation={2}>
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

      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
          Transactions
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
              iconColor={theme.text}
            />
          }
        >
          <Menu.Item
            leadingIcon="format-list-checks"
            onPress={() => {
              setMenuVisible(false);
              setTemplateModalVisible(true);
            }}
            title="Set Default Split"
          />
        </Menu>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No expenses yet. Tap + to add one.</Text>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.notes || 'Expense'}
            description={`${new Date(item.date).toLocaleDateString()} · ${item.splitMethod} split`}
            left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
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
        onPress={() => navigation.navigate('AddExpenseModal', { groupId })}
      />

      {/* Default Split Template Modal */}
      <Portal>
        <Modal
          visible={templateModalVisible}
          onDismiss={() => setTemplateModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.surface }]}
        >
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.text }]}>
            Default Split Method
          </Text>
          <Text variant="bodySmall" style={styles.modalSub}>
            This will be pre-selected when you add expenses to this group.
          </Text>
          <RadioButton.Group
            value={selectedMethod}
            onValueChange={v => setSelectedMethod(v as SplitMethod)}
          >
            {SPLIT_OPTIONS.map(opt => (
              <RadioButton.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                color={theme.primary}
                labelStyle={{ color: theme.text }}
              />
            ))}
          </RadioButton.Group>
          <View style={styles.modalActions}>
            <Button onPress={() => setTemplateModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveTemplate}>Save</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: { margin: 16, padding: 20, borderRadius: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceAmount: { color: '#FFF', fontWeight: 'bold' },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  balanceFooterText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 16, marginRight: 4 },
  sectionTitle: { fontWeight: '600' },
  amount: { alignSelf: 'center', fontWeight: '600', marginRight: 8 },
  emptyText: { color: '#999', textAlign: 'center', padding: 32 },
  fab: { position: 'absolute', bottom: 24, right: 24 },
  modal: { marginHorizontal: 24, borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '600', marginBottom: 4 },
  modalSub: { color: '#888', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
