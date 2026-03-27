import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import BillsScreen from '../screens/BillsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import FriendsScreen from '../screens/FriendsScreen';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

const tabIcon =
  (active: string, inactive: string) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) =>
    <Icon source={focused ? active : inactive} color={color} size={size} />;

export default function AppNavigator() {
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ tabBarIcon: tabIcon('account-group', 'account-group-outline') }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsScreen}
        options={{ tabBarIcon: tabIcon('receipt', 'receipt-outline') }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ tabBarIcon: tabIcon('bell', 'bell-outline') }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ tabBarIcon: tabIcon('account-multiple', 'account-multiple-outline') }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ tabBarIcon: tabIcon('clock', 'clock-outline') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon('cog', 'cog-outline') }}
      />
    </Tab.Navigator>
  );
}
