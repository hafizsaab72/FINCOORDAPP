import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import AppNavigator from './AppNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import CreateGroupModal from '../screens/CreateGroupModal';
import SettleUpModal from '../screens/SettleUpModal';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useStore(state => state.token);
  const initialRoute = token ? 'MainTabs' : 'Welcome';
  const { theme } = useAppTheme();

  const headerOptions = {
    headerStyle: {
      backgroundColor: theme.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    headerTintColor: theme.primary,
    headerTitleStyle: {
      fontFamily: 'Lato',
      fontWeight: '700' as const,
      fontSize: 18,
      color: theme.text,
    },
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: true, title: 'Sign In', ...headerOptions }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: true, title: 'Create Account', ...headerOptions }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: 'Forgot Password', ...headerOptions }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: true, title: 'Reset Password', ...headerOptions }} />
      <Stack.Screen name="MainTabs" component={AppNavigator} />

      <Stack.Group screenOptions={{ presentation: 'modal', headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}>
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="CreateGroupModal" component={CreateGroupModal} options={{ title: 'Create Group', ...headerOptions }} />
        <Stack.Screen name="SettleUpModal" component={SettleUpModal} options={{ title: 'Settle Up', ...headerOptions }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
