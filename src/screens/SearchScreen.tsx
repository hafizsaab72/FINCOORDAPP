import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Chip, Divider, List, Icon, SegmentedButtons, TouchableRipple, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { formatAmount } from '../utils/currency';
import { haptics } from '../utils/haptics';
import AppSearchBar from '../components/AppSearchBar';
import { expensesService } from '../services/expensesService';
import { Expense } from '../types';

type SortKey = 'newest' | 'oldest' | 'highest';

const CATEGORIES = ['All', 'Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Other'];

export default function SearchScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const currency = useStore(state => state.currency);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterCategory, setFilterCategory] = useState('All');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [apiExpenses, setApiExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    expensesService.getAll(100)
      .then(res => {
        if (res?.expenses) setApiExpenses(res.expenses);
      })
      .catch(() => {});
  }, []);

  const results: Expense[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const min = minAmount ? parseFloat(minAmount) : -Infinity;
    const max = maxAmount ? parseFloat(maxAmount) : Infinity;

    return apiExpenses
      .filter(e => {
        if (q && !e.title?.toLowerCase().includes(q) && !e.notes?.toLowerCase().includes(q)) return false;
        if (e.totalAmount < min || e.totalAmount > max) return false;
        if (filterCategory !== 'All' && e.category !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortKey === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
        return b.totalAmount - a.totalAmount;
      });
  }, [query, apiExpenses, sortKey, filterCategory, minAmount, maxAmount]);

  const handlePressExpense = (expense: Expense) => {
    haptics.light();
    if (expense.groupId) {
      navigation.navigate('GroupsTab', { screen: 'GroupDetail', params: { groupId: expense.groupId, groupName: '' } });
    } else {
      navigation.navigate('AddExpense', { expenseId: expense.id });
    }
  };

  const renderItem = ({ item }: { item: Expense }) => {
    return (
      <Surface elevation={1} style={[styles.card, { backgroundColor: theme.surface }]}>
        <TouchableRipple
          onPress={() => handlePressExpense(item)}
          rippleColor="rgba(0,0,0,0.06)"
        >
          <List.Item
            title={item.title || 'Expense'}
            description={`${new Date(item.date).toLocaleDateString()} · ${item.splitMethod} split`}
            left={props => <List.Icon {...props} icon="cash-multiple" color={theme.primary} />}
            right={() => (
              <View style={styles.rightCol}>
                <Text variant="titleSmall" style={{ color: theme.text }}>
                  {formatAmount(item.totalAmount, currency)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.textSecondary }}>expense</Text>
              </View>
            )}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.textSecondary }}
          />
        </TouchableRipple>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchRow}>
        <AppSearchBar
          placeholder="Search expenses..."
          value={query}
          onChangeText={setQuery}
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

      {/* Category filter */}
      <View style={styles.categoryRow}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={c => c}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: cat }) => (
            <Chip
              selected={filterCategory === cat}
              onPress={() => {
                haptics.selection();
                setFilterCategory(cat);
              }}
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
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider style={{ marginVertical: 4 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="text-search" size={48} color={theme.border} />
            <Text variant="bodyMedium" style={{ color: theme.textSecondary, marginTop: 12 }}>
              {query ? 'No matches found' : 'Type to search your expenses'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { padding: 12, paddingBottom: 0 },
  amountRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  amountInput: { flex: 1 },
  categoryRow: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: { marginRight: 6 },
  segmented: { marginHorizontal: 12, marginBottom: 8 },
  resultCount: { paddingHorizontal: 16, marginBottom: 4 },
  card: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', marginVertical: 4 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', marginRight: 4 },
  empty: { alignItems: 'center', padding: 48 },
});
