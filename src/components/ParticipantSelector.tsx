import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { Participant, GroupMember } from '../types';
import AppAvatar from './AppAvatar';

interface ParticipantSelectorProps {
  participants: Participant[];
  groupMembers?: GroupMember[];
  contextType: 'group' | 'non_group';
  onChange: (participants: Participant[]) => void;
}

export default function ParticipantSelector({
  participants,
  groupMembers,
  onChange,
}: ParticipantSelectorProps) {
  const theme = useTheme();

  const toggleParticipant = (userId: string) => {
    const updated = participants.map(p =>
      p.userId === userId ? { ...p, isActive: !p.isActive } : p
    );
    onChange(updated);
  };

  const activeCount = participants.filter(p => p.isActive).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ color: theme.colors.textSecondary }}>
          Participants
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.textTertiary }}>
          {activeCount} active
        </Text>
      </View>

      {activeCount < 2 && (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
          You need at least 2 people to split an expense.
        </Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipsRow}>
          {participants.map(p => {
            const member = groupMembers?.find(m => m._id === p.userId);
            return (
              <TouchableOpacity
                key={p.userId}
                style={[
                  styles.chip,
                  {
                    backgroundColor: p.isActive
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: p.isActive
                      ? theme.colors.primary
                      : theme.colors.outline,
                  },
                ]}
                onPress={() => toggleParticipant(p.userId)}>
                <AppAvatar
                  user={{
                    _id: p.userId,
                    name: p.name,
                    profilePic: member?.profilePic,
                  }}
                  size={36}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    color: p.isActive
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}>
                  {p.name}
                </Text>
                <Checkbox
                  status={p.isActive ? 'checked' : 'unchecked'}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  chip: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 72,
  },
});
