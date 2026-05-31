import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Modal, Portal, Searchbar } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES, getSymbol } from '../utils/currency';

interface CurrencySelectorProps {
  selected: string;
  onSelect: (code: string) => void;
}

export default function CurrencySelector({ selected, onSelect }: CurrencySelectorProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = CURRENCIES.filter(
    c =>
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (code: string) => {
    onSelect(code);
    setVisible(false);
    setQuery('');
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
        ]}
        onPress={() => setVisible(true)}>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {getSymbol(selected)} {selected}
        </Text>
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Select Currency
          </Text>
          <Searchbar
            placeholder="Search currency..."
            onChangeText={setQuery}
            value={query}
            style={{ marginBottom: 12, backgroundColor: theme.colors.surfaceVariant }}
            inputStyle={{ color: theme.colors.onSurface }}
            iconColor={theme.colors.textSecondary}
            placeholderTextColor={theme.colors.textTertiary}
          />
          <ScrollView style={{ maxHeight: 400 }}>
            {filtered.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyRow,
                  {
                    backgroundColor:
                      selected === c.code
                        ? theme.colors.primaryContainer
                        : 'transparent',
                  },
                ]}
                onPress={() => handleSelect(c.code)}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {c.symbol} {c.code}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: '700',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
