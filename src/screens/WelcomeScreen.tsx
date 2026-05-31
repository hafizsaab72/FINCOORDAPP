import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Button } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme, useTheme } from '../context/ThemeContext';
import { Images } from '../constants/images';
import { haptics } from '../utils/haptics';
import AnimatedParticles from '../components/AnimatedParticles';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Royal Purple gradient — replaces old blue gradient
  const gradientColors = isDark
    ? ['#0F0A1A', '#1A0F2E', '#0F0A1A']
    : ['#7C3AED', '#A855F7', '#C084FC'];

  // Orb animation values
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb3Scale = useSharedValue(1);

  useEffect(() => {
    // Subtle floating motion on the orbs
    orb1Y.value = withRepeat(
      withTiming(-12, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    orb2X.value = withRepeat(
      withTiming(10, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    orb3Scale.value = withRepeat(
      withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const orb1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1Y.value }],
  }));
  const orb2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }],
  }));
  const orb3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orb3Scale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Animated particle layer */}
      <AnimatedParticles />

      {/* Decorative geometric shapes with subtle animation */}
      <View style={styles.shapesContainer}>
        <Animated.View
          style={[styles.orb1, isDark && styles.orb1Dark, orb1AnimatedStyle]}
        />
        <Animated.View
          style={[styles.orb2, isDark && styles.orb2Dark, orb2AnimatedStyle]}
        />
        <Animated.View
          style={[styles.orb3, isDark && styles.orb3Dark, orb3AnimatedStyle]}
        />
        <View
          style={[styles.gridLine, { borderColor: 'rgba(255,255,255,0.03)' }]}
        />
        <View
          style={[styles.gridLine2, { borderColor: 'rgba(255,255,255,0.03)' }]}
        />
      </View>

      {/* Logo and tagline */}
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Logo */}
        <Image
          source={Images.logos.grayscaleDark}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* App name */}
        {/* <Text style={[styles.appName, { color: isDark ? '#FFFFFF' : 'rgba(30,16,48,0.95)' }]}>
          OnTheTab
        </Text> */}

        {/* Tagline */}
        <Text
          variant="titleMedium"
          style={[
            styles.subtitle,
            {
              color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,16,48,0.75)',
            },
          ]}
        >
          Keep tabs, not grudges.
        </Text>

        {/* Feature pills */}
        <View style={styles.featureRow}>
          <View
            style={[
              styles.featurePill,
              isDark ? styles.pillDark : styles.pillLight,
            ]}
          >
            <Text
              style={[
                styles.featureText,
                { color: isDark ? colors.accentPrimary : '#7C3AED' },
              ]}
            >
              Split expenses
            </Text>
          </View>
          <View
            style={[
              styles.featurePill,
              isDark ? styles.pillDark : styles.pillLight,
            ]}
          >
            <Text
              style={[
                styles.featureText,
                { color: isDark ? colors.accentPrimary : '#7C3AED' },
              ]}
            >
              Track bills
            </Text>
          </View>
          <View
            style={[
              styles.featurePill,
              isDark ? styles.pillDark : styles.pillLight,
            ]}
          >
            <Text
              style={[
                styles.featureText,
                { color: isDark ? colors.accentPrimary : '#7C3AED' },
              ]}
            >
              Settle up
            </Text>
          </View>
        </View>
      </View>

      {/* Footer with buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Button
          mode="contained"
          onPress={() => {
            haptics.medium();
            navigation.navigate('SignUp');
          }}
          icon="account-plus"
          contentStyle={styles.btnContent}
          // Fixed: was hardcoded '#3B82F6', now uses theme accentPrimary
          style={[styles.btn, { backgroundColor: colors.accentPrimary }]}
          labelStyle={styles.btnLabel}
        >
          Create Account
        </Button>

        <Button
          mode="outlined"
          onPress={() => {
            haptics.medium();
            navigation.navigate('SignIn');
          }}
          icon="login"
          contentStyle={styles.btnContent}
          style={[
            styles.btn,
            {
              borderColor: isDark
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(124,58,237,0.4)',
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(124,58,237,0.06)',
            },
          ]}
          textColor={isDark ? '#FFFFFF' : '#7C3AED'}
          labelStyle={styles.btnLabel}
        >
          Sign In
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shapesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  // Royal Purple orbs — replaces old blue (#3B82F6) tones
  orb1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    top: -width * 0.3,
    right: -width * 0.3,
  },
  orb1Dark: {
    backgroundColor: 'rgba(168, 85, 247, 0.10)',
  },
  orb2: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    bottom: height * 0.3,
    left: -width * 0.15,
  },
  orb2Dark: {
    backgroundColor: 'rgba(192, 132, 252, 0.06)',
  },
  orb3: {
    position: 'absolute',
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: 'rgba(236, 72, 153, 0.10)',
    bottom: height * 0.2,
    right: width * 0.1,
  },
  orb3Dark: {
    backgroundColor: 'rgba(236, 72, 153, 0.05)',
  },
  gridLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    left: '30%',
    borderLeftWidth: 1,
  },
  gridLine2: {
    position: 'absolute',
    width: 1,
    height: '100%',
    right: '25%',
    borderLeftWidth: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    zIndex: 1,
  },
  logo: {
    width: 250,
    height: 120,
    marginBottom: 8,
  },
  appName: {
    fontFamily: 'Space Grotesk',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: 'Inter',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontSize: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  featurePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillLight: {
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.20)',
  },
  pillDark: {
    // Royal Purple pill — replaces old blue pill
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  featureText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
    zIndex: 1,
  },
  btn: {
    borderRadius: 14,
  },
  btnContent: {
    paddingVertical: 6,
    height: 54,
  },
  btnLabel: {
    fontFamily: 'Space Grotesk',
    fontWeight: '700',
    fontSize: 16,
  },
});
