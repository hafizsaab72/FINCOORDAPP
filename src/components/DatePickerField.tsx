import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { DatePickerModal } from 'react-native-paper-dates';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface DatePickerFieldProps {
  date: string; // ISO string
  onChange: (date: string) => void;
  label?: string;
}

export default function DatePickerField({ date, onChange, label = 'Date' }: DatePickerFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const parsedDate = date ? new Date(date) : new Date();

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const onConfirm = useCallback(
    (params: any) => {
      setVisible(false);
      if (params.date) {
        onChange(params.date.toISOString());
      }
    },
    [onChange]
  );

  const formatted = parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={[styles.header, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
        ]}
        onPress={() => setVisible(true)}>
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={theme.colors.textSecondary}
        />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
          {formatted}
        </Text>
      </TouchableOpacity>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={visible}
        onDismiss={onDismiss}
        date={parsedDate}
        onConfirm={onConfirm}
        saveLabel="Select"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
