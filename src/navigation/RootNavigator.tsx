import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppNavigator from './AppNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import AddExpenseModal from '../screens/AddExpenseModal';
import AddBillModal from '../screens/AddBillModal';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import BillDetailScreen from '../screens/BillDetailScreen';
import CreateGroupModal from '../screens/CreateGroupModal';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={AppNavigator} />

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
        <Stack.Screen
          name="AddExpenseModal"
          component={AddExpenseModal}
          options={{ title: 'Add Expense' }}
        />
        <Stack.Screen
          name="AddBillModal"
          component={AddBillModal}
          options={{ title: 'Add Bill' }}
        />
        <Stack.Screen
          name="CreateGroupModal"
          component={CreateGroupModal}
          options={{ title: 'Create Group' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
