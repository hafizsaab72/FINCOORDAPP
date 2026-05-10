import HapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const haptics = {
  light: () => HapticFeedback.trigger('impactLight', options),
  medium: () => HapticFeedback.trigger('impactMedium', options),
  heavy: () => HapticFeedback.trigger('impactHeavy', options),
  success: () => HapticFeedback.trigger('notificationSuccess', options),
  error: () => HapticFeedback.trigger('notificationError', options),
  warning: () => HapticFeedback.trigger('notificationWarning', options),
  selection: () => HapticFeedback.trigger('selection', options),
};
