import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Text, Chip, Divider, List, Icon, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { Expense, Bill } from '../types';

type ResultItem =
  | { kind: 'expense'; data: Expense }
  | { kind: 'bill'; data: Bill };

type SortKey = 'newest' | 'oldest' | 'highest';

const CATEGORIES = ['All', 'Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Other'];

export default function SearchScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const expenses = useStore(state => state.expenses);
  const bills = useStore(state => state.bills);
  const currency = useStore(state => state.currency);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterCategory, setFilterCategory] = useState('All');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const results: ResultItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const min = minAmount ? parseFloat(minAmount) : -Infinity;
    const max = maxAmount ? parseFloat(maxAmount) : Infinity;

    const expenseResults: ResultItem[] = expenses
      .filter(e => {
        if (q && !e.notes?.toLowerCase().includes(q)) return false;
        if (e.amount < min || e.amount > max) return false;
        return true;
      })
      .map(e => ({ kind: 'expense' as const, data: e }));

    const billResults: ResultItem[] = bills
      .filter(b => {
        if (q && !b.title.toLowerCase().includes(q)) return false;
        if (filterCategory !== 'All' && b.category !== filterCategory) return false;
        if (b.amount < min || b.amount > max) return false;
        return true;
      })
      .map(b => ({ kind: 'bill' as const, data: b }));

    const combined = [...expenseResults, ...billResults];

    return combined.sort((a, b) => {
      const dateA = a.kind === 'expense' ? a.data.date : a.data.dueDate;
      const dateB = b.kind === 'expense' ? b.data.date : b.data.dueDate;
      const amtA = a.data.amount;
      const amtB = b.data.amount;

      if (sortKey === 'newest') return new Date(dateB).getTime() - new Date(dateA).getTime();
      if (sortKey === 'oldest') return new Date(dateA).getTime() - new Date(dateB).getTime();
      return amtB - amtA; // highest
    });
  }, [query, expenses, bills, sortKey, filterCategory, minAmount, maxAmount]);

  const handlePressExpense = (expense: Expense) => {
    if (expense.groupId && expense.groupId !== 'direct') {
      navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: expense.groupId, groupName: '' } });
    }
  };

  const handlePressBill = (bill: Bill) => {
    navigation.navigate('HomeTab', { screen: 'BillDetail', params: { billId: bill.id } });
  };

  const renderItem = ({ item }: { item: ResultItem }) => {
    if (item.kind === 'expense') {
      const e = item.data;
      return (
        <TouchableOpacity onPress={() => handlePressExpense(e)} activeOpacity={0.7}>
          <List.Item
            title={e.notes || 'Expense'}
            description={`${new Date(e.date).toLocaleDateString()} · ${e.splitMethod} split`}
            left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
            right={() => (
              <View style={styles.rightCol}>
                <Text variant="titleSmall" style={{ color: theme.text, fontWeight: '600' }}>
                  {formatAmount(e.amount, currency)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.textSecondary }}>expense</Text>
              </View>
            )}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </TouchableOpacity>
      );
    }

    const b = item.data;
    return (
      <TouchableOpacity onPress={() => handlePressBill(b)} activeOpacity={0.7}>
        <List.Item
          title={b.title}
          description={`Due ${new Date(b.dueDate).toLocaleDateString()} · ${b.category}`}
          left={props => <List.Icon {...props} icon="receipt-text" color="#FFAA00" />}
          right={() => (
            <View style={styles.rightCol}>
              <Text variant="titleSmall" style={{ color: theme.text, fontWeight: '600' }}>
                {formatAmount(b.amount, currency)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.textSecondary }}>bill</Text>
            </View>
          )}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: theme.textSecondary }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          placeholder="Search expenses and bills..."
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" />}
          right={query ? <TextInput.Icon icon="close" onPress={() => setQuery('')} /> : undefined}
          style={styles.searchInput}
          dense
        />
      </View>

      {/* Amount range */}
      <View style={styles.amountRow}>
        <TextInput
          mode="outlined"
          label="Min $"
          keyboardType="decimal-pad"
          value={minAmount}
          onChangeText={setMinAmount}
          style={styles.amountInput}
          dense
        />
        <TextInput
          mode="outlined"
          label="Max $"
          keyboardType="decimal-pad"
          value={maxAmount}
          onChangeText={setMaxAmount}
          style={styles.amountInput}
          dense
        />
      </View>

      {/* Category filter (for bills) */}
      <View style={styles.categoryRow}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={c => c}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: cat }) => (
            <Chip
              selected={filterCategory === cat}
              onPress={() => setFilterCategory(cat)}
              style={styles.chip}
              compact
            >
              {cat}
            </Chip>
          )}
        />
      </View>

      {/* Sort */}
      <SegmentedButtons
        value={sortKey}
        onValueChange={v => setSortKey(v as SortKey)}
        buttons={[
          { value: 'newest', label: 'Newest', icon: 'sort-calendar-descending' },
          { value: 'oldest', label: 'Oldest', icon: 'sort-calendar-ascending' },
          { value: 'highest', label: 'Highest', icon: 'sort-numeric-descending' },
        ]}
        style={styles.segmented}
      />

      <Text variant="bodySmall" style={[styles.resultCount, { color: theme.textSecondary }]}>
        {results.length} result{results.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item, idx) =>
          item.kind === 'expense' ? item.data.id : `bill-${item.data.id}-${idx}`
        }
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="text-search" size={48} color={theme.border} />
            <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
              {query ? 'No matches found' : 'Type to search your expenses and bills'}
            </Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { padding: 12, paddingBottom: 0 },
  searchInput: { flex: 1 },
  amountRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  amountInput: { flex: 1 },
  categoryRow: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: { marginRight: 6 },
  segmented: { marginHorizontal: 12, marginBottom: 8 },
  resultCount: { paddingHorizontal: 16, marginBottom: 4 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', marginRight: 4 },
  empty: { alignItems: 'center', padding: 48 },
});
