import React from 'react';
import { Image } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupAnalyticsScreen from '../screens/GroupAnalyticsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';

import FriendDetailScreen from '../screens/FriendDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import InviteScreen from '../screens/InviteScreen';
import MyQRCodeScreen from '../screens/MyQRCodeScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import { useAppTheme } from '../context/ThemeContext';
import ClassicTabBar from '../components/ClassicTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RenderClassicTabBar(props: BottomTabBarProps) {
  return <ClassicTabBar {...props} />;
}

function useHeaderOptions() {
  const { theme } = useAppTheme();

  return {
    headerStyle: {
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTintColor: theme.primary,
    headerTitleStyle: {
      fontFamily: 'Space Grotesk',
      fontWeight: '700' as const,
      fontSize: 18,
      color: theme.text,
    },
  };
}

function LogoTitle() {
  // const { isDark } = useAppTheme();
  // const source = isDark
  //   ? require('../assets/images/logos/dark-logo-text-without-background.png')
  //   : require('../assets/images/logos/grayscale-logo-text-without-background.png');

  const source = require('../assets/images/logos/dark-logo-text-without-background.png');
  
  return (
    <Image
      source={source}
      style={{ width: 150, height: 60, resizeMode: 'contain' }}
      accessibilityLabel="OnTheTab"
    />
  );
}

function HomeStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: true, headerTitle: () => <LogoTitle /> }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ headerShown: true, title: 'Activity' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: true, title: 'Analytics' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, title: 'Search' }}
      />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ headerShown: true, title: 'Friends' }}
      />
      <Stack.Screen
        name="FriendDetail"
        component={FriendDetailScreen}
        options={{ headerShown: true, title: 'Friend' }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ headerShown: true, title: 'Activity' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: true, title: 'Analytics' }}
      />
      <Stack.Screen
        name="Invite"
        component={InviteScreen}
        options={{ headerShown: true, title: 'Invite' }}
      />
      <Stack.Screen
        name="MyQRCode"
        component={MyQRCodeScreen}
        options={{ headerShown: false, title: 'Scan Code' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ headerShown: true, title: 'Scan QR' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, title: 'Search' }}
      />
      <Stack.Group
        screenOptions={{ presentation: 'modal', headerShown: false }}
      >
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

function GroupsStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ headerShown: true, title: 'Groups' }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Group' }}
      />
      <Stack.Screen
        name="GroupSettings"
        component={GroupSettingsScreen}
        options={{ headerShown: true, title: 'Group Settings' }}
      />
      <Stack.Screen
        name="GroupAnalytics"
        component={GroupAnalyticsScreen}
        options={{ headerShown: true, title: 'Group Analytics' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ headerShown: true, title: 'Scan QR' }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ headerShown: true, title: 'Activity' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: true, title: 'Analytics' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, title: 'Search' }}
      />
      <Stack.Group
        screenOptions={{ presentation: 'modal', headerShown: false }}
      >
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

function AccountStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...headerOptions }}>
      <Stack.Screen
        name="Account"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Account' }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ headerShown: true, title: 'Activity' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'My Profile' }}
      />
      <Stack.Screen
        name="Upgrade"
        component={UpgradeScreen}
        options={{ headerShown: true, title: 'OnTheTab Pro' }}
      />
      <Stack.Screen
        name="MyQRCode"
        component={MyQRCodeScreen}
        options={{ headerShown: false, title: 'Scan Code' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ headerShown: true, title: 'Scan QR' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: true, title: 'Analytics' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, title: 'Search' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.primary,
        headerTitleStyle: {
          fontFamily: 'Space Grotesk',
          fontWeight: '700' as const,
          fontSize: 18,
          color: theme.text,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
      }}
      tabBar={RenderClassicTabBar}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          headerShown: false,
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsStack}
        options={{
          headerShown: false,
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsStack}
        options={{
          headerShown: false,
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people-circle' : 'people-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          headerShown: false,
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
