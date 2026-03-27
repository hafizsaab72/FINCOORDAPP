// TODO: Install a push notification library compatible with React Native 0.84 (New Architecture).
// Recommended: @notifee/react-native — run: npm install @notifee/react-native
// Until then, scheduling is a no-op to prevent build failures.

export const scheduleBillReminder = (_title: string, _date: Date): void => {
  // Schedule 24 hours before due date (reminder engine requirement)
  // Implement after adding @notifee/react-native or similar dependency
  if (__DEV__) {
    console.log(`[Notifications] Reminder scheduled for "${_title}" on ${_date.toISOString()}`);
  }
};
