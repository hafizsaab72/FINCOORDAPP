import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useAppTheme } from '../context/ThemeContext';
import {
  CLASSIC_TAB_BAR_TOP_PADDING,
  CLASSIC_TAB_BAR_BOTTOM_PADDING,
} from '../constants/tabBar';

/* ─── Haptic Trigger ────────────────────────────────────────────────────── */

function triggerHaptic() {
  ReactNativeHapticFeedback.trigger('impactLight', {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });
}

/* ─── Icon Mapping ──────────────────────────────────────────────────────── */

const TAB_ICON_MAP: Record<
  string,
  { active: string; inactive: string }
> = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  FriendsTab: { active: 'people', inactive: 'people-outline' },
  GroupsTab: { active: 'people-circle', inactive: 'people-circle-outline' },
  ActivityTab: { active: 'time', inactive: 'time-outline' },
  AccountTab: { active: 'person-circle', inactive: 'person-circle-outline' },
};

/* ─── Main Component ────────────────────────────────────────────────────── */

/* ─── Helper: get leaf route name from nested navigator state ──────────────── */

function getLeafRouteName(state: BottomTabBarProps['state']): string {
  let current = state;
  while (current.routes[current.index]?.state) {
    current = current.routes[current.index].state as typeof state;
  }
  return current.routes[current.index]?.name ?? '';
}

export default function ClassicTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, isDark } = useAppTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  // Hide tab bar on any screen except the 4 root tab screens
  const leafRoute = getLeafRouteName(state);
  const nonRootRoutes = [
    'AddExpense', 'CreateGroupModal', 'SettleUpModal',
    'Activity', 'Analytics', 'Search',
    'GroupDetail', 'GroupSettings', 'GroupAnalytics',
    'FriendDetail',
    'Profile', 'Upgrade', 'Invite', 'MyQRCode', 'QRScanner',
  ];
  if (nonRootRoutes.includes(leafRoute)) {
    return null;
  }

  const activeColor = theme.primary;
  const inactiveColor = theme.textSecondary;

  // Glass-tinted background using theme surface
  const backgroundColor = isDark
    ? 'rgba(26, 20, 37, 0.92)'
    : 'rgba(255, 255, 255, 0.92)';

  return (
    <View
      style={[
        styles.container,
        { bottom: bottomInset + CLASSIC_TAB_BAR_BOTTOM_PADDING },
      ]}
    >
      {/* Background layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.background,
          { backgroundColor },
        ]}
      />

      {/* Tab buttons */}
      <View style={[styles.inner, { paddingTop: CLASSIC_TAB_BAR_TOP_PADDING }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const color = isFocused ? activeColor : inactiveColor;
          const label = options.title ?? route.name;

          const iconConfig = TAB_ICON_MAP[route.name];
          const iconName = iconConfig
            ? isFocused
              ? iconConfig.active
              : iconConfig.inactive
            : 'ellipse';

          const onPress = () => {
            triggerHaptic();

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <Ionicons name={iconName} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  background: {
    borderRadius: 24,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: CLASSIC_TAB_BAR_BOTTOM_PADDING,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: 'Lato',
    fontWeight: '500',
    fontSize: 11,
  },
});
