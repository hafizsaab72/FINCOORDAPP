import React, { useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolation,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { Icon } from 'react-native-paper';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '../context/ThemeContext';
import {
  LIQUID_TAB_BAR_HEIGHT,
  LIQUID_TAB_BAR_MARGIN,
  LIQUID_TAB_BAR_BUBBLE_PADDING,
  LIQUID_TAB_BAR_TAB_PADDING,
  LIQUID_TAB_BAR_MAX_WIDTH,
  LIQUID_TAB_BAR_PILL_WIDTH_PERCENT,
} from '../constants/tabBar';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TAB_COUNT = 5;
const ICON_SIZE = 22;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 0.8,
};

/* ─── Haptic Trigger ────────────────────────────────────────────────────── */

function triggerHaptic() {
  ReactNativeHapticFeedback.trigger('impactLight', {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });
}

/* ─── Tab Item Sub-component ────────────────────────────────────────────── */

interface TabItemProps {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  activeIndex: SharedValue<number>;
  descriptor: BottomTabBarProps['descriptors'][string];
  isFocused: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}

function TabItem({
  route,
  index,
  activeIndex,
  descriptor,
  isFocused,
  onPress,
  activeColor,
  inactiveColor,
}: TabItemProps) {
  const { options } = descriptor;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const dist = Math.abs(activeIndex.value - index);
    const scale = interpolate(
      dist,
      [0, 1],
      [1.15, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      dist,
      [0, 1],
      [1, 0.5],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const dist = Math.abs(activeIndex.value - index);
    const opacity = interpolate(
      dist,
      [0, 0.7],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const color = interpolateColor(
      dist,
      [0, 1],
      [activeColor, inactiveColor],
    );
    return { opacity, color };
  });

  const iconColor = isFocused ? activeColor : inactiveColor;
  const iconElement = options.tabBarIcon?.({
    color: iconColor,
    size: ICON_SIZE,
    focused: isFocused,
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title}
    >
      <Animated.View style={[styles.tabInner, animatedContainerStyle]}>
        {iconElement}
        <Animated.Text
          style={[
            styles.label,
            labelAnimatedStyle,
            { fontFamily: 'Lato', fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {options.title ?? route.name}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export default function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme, isDark } = useAppTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');

  const pillWidth = Math.min(
    LIQUID_TAB_BAR_MAX_WIDTH,
    screenWidth * LIQUID_TAB_BAR_PILL_WIDTH_PERCENT,
  );

  const activeIndex = useSharedValue(state.index);
  const measuredPillWidth = useSharedValue(pillWidth);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, SPRING_CONFIG);
  }, [state.index, activeIndex]);

  const tabWidth = useDerivedValue(() => {
    return (
      (measuredPillWidth.value - LIQUID_TAB_BAR_TAB_PADDING * 2) / TAB_COUNT
    );
  });

  const bubbleWidth = useDerivedValue(() => {
    return tabWidth.value - LIQUID_TAB_BAR_BUBBLE_PADDING * 2;
  });

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const tw = tabWidth.value;
    const bw = bubbleWidth.value;
    if (tw === 0 || bw <= 0) {
      return { opacity: 0 };
    }
    const translateX =
      LIQUID_TAB_BAR_TAB_PADDING +
      activeIndex.value * tw +
      LIQUID_TAB_BAR_BUBBLE_PADDING;
    return {
      transform: [{ translateX }],
      width: bw,
      opacity: 1,
    };
  });

  const onPillLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      measuredPillWidth.value = width;
    },
    [measuredPillWidth],
  );

  /* ── Glass color tokens (Midnight Slate theme) ─────────────── */
  const activeColor = theme.colors.accentPrimary;
  const inactiveColor = theme.colors.textSecondary;

  // Slate-tinted glass (no green tint)
  const glassBaseBg = isDark
    ? 'rgba(20, 27, 36, 0.72)'
    : 'rgba(255, 255, 255, 0.80)';

  const glassBorder = isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(0, 0, 0, 0.10)';

  // Blue-tinted bubble indicator
  const bubbleBg = isDark
    ? 'rgba(59, 130, 246, 0.15)'
    : 'rgba(37, 99, 235, 0.12)';

  const bubbleBorder = isDark
    ? 'rgba(59, 130, 246, 0.25)'
    : 'rgba(37, 99, 235, 0.20)';

  const gradientColors = isDark
    ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'rgba(0,0,0,0.03)']
    : ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.02)'];

  /* ── Shadow / elevation ─────────────────────────────────────────────── */
  const pillShadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 28,
    },
    android: {
      elevation: 12,
    },
  });

  return (
    <View
      style={[
        styles.container,
        { bottom: bottomInset },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pill,
          {
            width: pillWidth,
            height: LIQUID_TAB_BAR_HEIGHT,
            ...pillShadow,
          },
        ]}
        onLayout={onPillLayout}
      >
        {/* Layer 1: Base tint */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: glassBaseBg }]}
          pointerEvents="none"
        />

        {/* Layer 2: Gradient sheen */}
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Layer 3: Inner glass border */}
        <View
          style={[
            styles.innerBorder,
            { borderColor: glassBorder },
          ]}
          pointerEvents="none"
        />

        {/* Layer 4: Sliding bubble indicator */}
        <Animated.View
          style={[
            styles.bubble,
            bubbleAnimatedStyle,
            {
              backgroundColor: bubbleBg,
              borderColor: bubbleBorder,
              ...Platform.select({
                ios: {
                  shadowColor: isDark ? '#fff' : '#000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isDark ? 0.08 : 0.04,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 0,
                },
              }),
            },
          ]}
          pointerEvents="none"
        />

        {/* Layer 5: Tabs */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

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

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              activeIndex={activeIndex}
              descriptor={descriptors[route.key]}
              isFocused={isFocused}
              onPress={onPress}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
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
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: LIQUID_TAB_BAR_TAB_PADDING,
    overflow: 'hidden',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    borderWidth: 1,
  },
  bubble: {
    position: 'absolute',
    top: LIQUID_TAB_BAR_BUBBLE_PADDING,
    bottom: LIQUID_TAB_BAR_BUBBLE_PADDING,
    left: 0,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
