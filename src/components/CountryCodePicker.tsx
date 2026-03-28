import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Text, Divider, Icon } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { COUNTRIES, Country, isoToFlag } from '../utils/countries';

interface Props {
  selected: Country;
  onSelect: (country: Country) => void;
  /** Local phone number (without dial code) */
  localNumber: string;
  onChangeLocalNumber: (v: string) => void;
  placeholder?: string;
}

/**
 * Combined country-code picker + phone number input in one row.
 * The left button opens a Modal bottom sheet with a searchable country list.
 */
export default function CountryCodePicker({
  selected,
  onSelect,
  localNumber,
  onChangeLocalNumber,
  placeholder = '7700 900123',
}: Props) {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso.toLowerCase().includes(q),
    );
  }, [search]);

  const handleOpen = () => {
    setSearch('');
    setVisible(true);
    setTimeout(() => searchRef.current?.focus(), 300);
  };

  const handleSelect = (c: Country) => {
    onSelect(c);
    setVisible(false);
    setSearch('');
  };

  return (
    <>
      {/* ── Inline row: [Flag +44 ▼] | [phone number input] ── */}
      <View style={[styles.row, { borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleOpen}
          style={[styles.trigger, { borderRightColor: theme.border }]}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{isoToFlag(selected.iso)}</Text>
          <Text style={[styles.dialCode, { color: theme.text }]}>{selected.dialCode}</Text>
          <Icon source="chevron-down" size={14} color="#888" />
        </TouchableOpacity>

        <TextInput
          style={[styles.phoneInput, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          value={localNumber}
          onChangeText={v => onChangeLocalNumber(v.replace(/[^0-9 \-()]/g, ''))}
          autoCorrect={false}
        />
      </View>

      {/* ── Country picker modal (bottom sheet) ── */}
      {/* Conditionally mount so the backdrop TouchableOpacity is never in the
          tree when closed — if left mounted with visible=false it swallows
          all screen touches (known RN issue with transparent Modals). */}
      {visible && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setVisible(false)}
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setVisible(false)}
            />

            <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />

              <Text variant="titleMedium" style={[styles.sheetTitle, { color: theme.text }]}>
                Select Country
              </Text>

              <View
                style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Icon source="magnify" size={20} color="#888" />
                <TextInput
                  ref={searchRef}
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search country or code…"
                  placeholderTextColor="#aaa"
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Icon source="close-circle" size={18} color="#aaa" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filtered}
                keyExtractor={item => item.iso}
                ItemSeparatorComponent={() => <Divider />}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryRow,
                      item.iso === selected.iso && { backgroundColor: theme.primary + '18' },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.rowFlag}>{isoToFlag(item.iso)}</Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.rowName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text variant="bodyMedium" style={[styles.rowDial, { color: theme.primary }]}>
                      {item.dialCode}
                    </Text>
                    {item.iso === selected.iso && (
                      <Icon source="check" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ── Inline row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
    height: 56,
    // NOTE: no overflow:'hidden' — it blocks TextInput touch events on Android
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: '100%',
    borderRightWidth: 1,
  },
  flag: { fontSize: 22 },
  dialCode: { fontWeight: '600', fontSize: 15 },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    height: '100%',
  },

  // ── Modal bottom sheet ──
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  list: {},
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  rowFlag: { fontSize: 22, width: 34 },
  rowName: { flex: 1 },
  rowDial: { fontWeight: '500', minWidth: 44, textAlign: 'right' },
});
