import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { avatarColor, getInitials } from '../utils/ui';

interface AppAvatarProps {
  user: { _id?: string; name: string; profilePic?: string };
  size?: number;
  variant?: 'circle' | 'square';
}

export default function AppAvatar({
  user,
  size = 48,
  variant = 'circle',
}: AppAvatarProps) {
  const theme = useTheme();
  const id = user._id || user.name;
  const borderRadius = variant === 'circle' ? size / 2 : size * 0.25;

  if (user.profilePic) {
    return (
      <Image
        source={{ uri: user.profilePic }}
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
        }}
        resizeMode="cover"
      />
    );
  }

  const initials = getInitials(user.name);
  const bgColor = avatarColor(id);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
        },
      ]}>
      <Text
        style={{
          color: '#FFF',
          fontWeight: '700',
          fontSize: size * 0.4,
        }}>
        {initials || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
