import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { lightTheme } from '../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTheme.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightTheme.border,
    marginBottom: 16,
  },
});
