import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';
import AppNavigator from './AppNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AddExpenseModal from '../screens/AddExpenseModal';
import AddBillModal from '../screens/AddBillModal';
import CreateGroupModal from '../screens/CreateGroupModal';
import SettleUpModal from '../screens/SettleUpModal';

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

      <Stack.Group screenOptions={{ presentation: 'modal', headerShown: false }}>
        <Stack.Screen name="AddExpenseModal" component={AddExpenseModal} />
        <Stack.Screen name="AddBillModal" component={AddBillModal} options={{ title: 'Add Bill' }} />
        <Stack.Screen name="CreateGroupModal" component={CreateGroupModal} options={{ title: 'Create Group' }} />
        <Stack.Screen name="SettleUpModal" component={SettleUpModal} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
