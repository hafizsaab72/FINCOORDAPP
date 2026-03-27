import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, FAB, Text, Divider } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

export default function GroupsScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const groups = useStore(state => state.groups);
  const expenses = useStore(state => state.expenses);

  const getGroupTotal = (groupId: string) =>
    expenses
      .filter(e => e.groupId === groupId)
      .reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyLarge" style={{ color: '#999', textAlign: 'center' }}>
            No groups yet.{'\n'}Tap + to create your first group.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${item.members.length} member${item.members.length !== 1 ? 's' : ''} · $${getGroupTotal(item.id).toFixed(2)} total`}
              left={props => (
                <List.Icon
                  {...props}
                  icon="account-group-outline"
                  color={theme.primary}
                />
              )}
              right={props => (
                <List.Icon {...props} icon="chevron-right" />
              )}
              onPress={() =>
                navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })
              }
              style={{ backgroundColor: theme.background }}
              titleStyle={{ color: theme.text }}
              descriptionStyle={{ color: '#888' }}
            />
          )}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary }]}
        color="#FFF"
        onPress={() => navigation.navigate('CreateGroupModal')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  fab: { position: 'absolute', bottom: 24, right: 24 },
});
