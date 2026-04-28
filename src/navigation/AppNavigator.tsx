import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import CustomizeGroupScreen from '../screens/CustomizeGroupScreen';
import FriendDetailScreen from '../screens/FriendDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import InviteScreen from '../screens/InviteScreen';
import MyQRCodeScreen from '../screens/MyQRCodeScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcon =
  (active: string, inactive: string) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) =>
    <Icon source={focused ? active : inactive} color={color} size={size} />;

function HomeStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: true, title: 'FinCoord' }} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ headerShown: true, title: 'Bill Detail' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }}>
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="FriendDetail" component={FriendDetailScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="Invite" component={InviteScreen} options={{ headerShown: true, title: 'Invite' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ headerShown: true, title: 'My QR Code' }} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
    </Stack.Navigator>
  );
}

function GroupsStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }}>
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: true, title: 'Groups' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ headerShown: true, title: 'Group Settings' }} />
      <Stack.Screen name="CustomizeGroup" component={CustomizeGroupScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
    </Stack.Navigator>
  );
}

function ActivityStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }}>
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: true, title: 'Activity' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
    </Stack.Navigator>
  );
}

function AccountStack() {
  const { theme } = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }}>
      <Stack.Screen name="Account" component={SettingsScreen} options={{ headerShown: true, title: 'Account' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'My Profile' }} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ headerShown: true, title: 'FinCoord Pro' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ headerShown: true, title: 'My QR Code' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
    </Stack.Navigator>
  );
}

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
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: tabIcon('home', 'home-outline'),
          headerShown: false,
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStack}
        options={{
          tabBarIcon: tabIcon('account-multiple', 'account-multiple-outline'),
          headerShown: false,
          title: 'Friends',
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsStack}
        options={{
          tabBarIcon: tabIcon('account-group', 'account-group-outline'),
          headerShown: false,
          title: 'Groups',
        }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={ActivityStack}
        options={{
          tabBarIcon: tabIcon('clock', 'clock-outline'),
          headerShown: false,
          title: 'Activity',
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          tabBarIcon: tabIcon('account-circle', 'account-circle-outline'),
          headerShown: false,
          title: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}
