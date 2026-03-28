import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';
import AppNavigator from './AppNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AddExpenseModal from '../screens/AddExpenseModal';
import AddBillModal from '../screens/AddBillModal';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import CreateGroupModal from '../screens/CreateGroupModal';
import ProfileScreen from '../screens/ProfileScreen';
import InviteScreen from '../screens/InviteScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import SearchScreen from '../screens/SearchScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useStore(state => state.token);
  const isGuest = useStore(state => state.isGuest);
  const initialRoute = (token || isGuest) ? 'MainTabs' : 'Welcome';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="MainTabs" component={AppNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'My Profile' }} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ headerShown: true, title: 'FinCoord Pro' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />

      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Group Detail' }}
      />
      <Stack.Screen
        name="BillDetail"
        component={BillDetailScreen}
        options={{ headerShown: true, title: 'Bill Detail' }}
      />

      <Stack.Group screenOptions={{ presentation: 'modal', headerShown: true }}>
        <Stack.Screen name="AddExpenseModal" component={AddExpenseModal} options={{ title: 'Add Expense' }} />
        <Stack.Screen name="AddBillModal" component={AddBillModal} options={{ title: 'Add Bill' }} />
        <Stack.Screen name="CreateGroupModal" component={CreateGroupModal} options={{ title: 'Create Group' }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
