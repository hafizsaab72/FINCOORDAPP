/**
 * AnimatedParticles — Cosmic Finance effect for WelcomeScreen
 * Pure Reanimated v4, no Skia, no external assets.
 *
 * Three particle types:
 *  - Bubbles: semi-transparent circles float upward with sine-wave wobble
 *  - Stars:    tiny white dots that twinkle (opacity pulse)
 *  - Sparkles: brief flash animations (scale + opacity burst)
 */

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useAppTheme } from '../context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Particle counts (reduced on Android for performance) ──────────────────────
const BUBBLE_COUNT = Platform.OS === 'android' ? 18 : 25;
const STAR_COUNT   = Platform.OS === 'android' ? 12 : 18;
const SPARKLE_COUNT = Platform.OS === 'android' ? 4  :  7;

// ── Colors ────────────────────────────────────────────────────────────────────
const PURPLE_COLORS = [
  'rgba(168, 85, 247, 0.55)',   // #A855F7
  'rgba(192, 132, 252, 0.45)',  // #C084FC
  'rgba(236, 72, 153, 0.35)',   // #EC4899
  'rgba(167, 139, 250, 0.40)',   // #A78BFA
  'rgba(139, 92, 246, 0.50)',   // #8B5CF6
];
const STAR_COLOR   = 'rgba(255, 255, 255, 0.85)';
const SPARKLE_COLOR = 'rgba(255, 255, 255, 0.95)';

// ── Seeded pseudo-random (avoids useState on every render) ───────────────────
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bubble
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleProps {
  index: number;
  color: string;
}

function Bubble({ index, color }: BubbleProps) {
  const startX    = seededRandom(index * 7 + 1)    * SCREEN_W;
  const size      = 8  + seededRandom(index * 7 + 2) * 24;  // 8–32px
  const duration  = 7000 + seededRandom(index * 7 + 3) * 6000; // 7–13s
  const delay     = seededRandom(index * 7 + 4)    * -12000; // stagger
  const wobbleAmp = 20 + seededRandom(index * 7 + 5) * 30;  // px
  const baseOpacity = 0.3 + seededRandom(index * 7 + 6) * 0.45;

  // Float from bottom to top
  const translateY = useSharedValue(SCREEN_H + size);
  // Horizontal drift
  const driftX    = useSharedValue(0);
  // Vertical wobble (sine)
  const wobble    = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-SCREEN_H - size * 2, { duration, easing: Easing.linear }),
        -1,  // infinite
        false
      )
    );
    wobble.value = withDelay(
      delay,
      withRepeat(
        withTiming(Math.PI * 2, { duration: 3000 + seededRandom(index * 9) * 2000 }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + Math.sin(wobble.value) * wobbleAmp },
      { translateY: translateY.value },
      { scale: 0.7 + Math.abs(Math.sin(wobble.value * 0.5)) * 0.3 },
    ],
    opacity: baseOpacity * (0.7 + Math.abs(Math.sin(wobble.value * 0.3)) * 0.3),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Star (twinkle dot)
// ─────────────────────────────────────────────────────────────────────────────

interface StarProps {
  index: number;
}

function Star({ index }: StarProps) {
  const x        = seededRandom(index * 11 + 10) * SCREEN_W;
  const y        = seededRandom(index * 11 + 11) * SCREEN_H * 0.75;
  const size     = 1.5 + seededRandom(index * 11 + 12) * 2.5;  // 1.5–4px
  const duration = 1500 + seededRandom(index * 11 + 13) * 2000; // 1.5–3.5s
  const delay    = seededRandom(index * 11 + 14) * -6000;

  const opacity = useSharedValue(0.15);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: duration * 0.35, easing: Easing.out(Easing.ease) }),
          withTiming(0.1, { duration: duration * 0.65, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + opacity.value * 0.7 }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top:  y,
          width:  size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: STAR_COLOR,
          shadowColor: '#FFFFFF',
          shadowOpacity: 0.6,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 0 },
        },
        animatedStyle,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle (4-point star flash)
// ─────────────────────────────────────────────────────────────────────────────

interface SparkleProps {
  index: number;
}

function Sparkle({ index }: SparkleProps) {
  const x        = seededRandom(index * 13 + 20) * SCREEN_W;
  const y        = seededRandom(index * 13 + 21) * SCREEN_H * 0.65;
  const baseSize = 6 + seededRandom(index * 13 + 22) * 6; // 6–12px
  const flashDuration = 800 + seededRandom(index * 13 + 23) * 600;
  const delay    = seededRandom(index * 13 + 24) * -8000;

  const scale    = useSharedValue(0);
  const opacity  = useSharedValue(0);

  useEffect(() => {
    scale.value   = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: flashDuration * 0.3, easing: Easing.out(Easing.ease) }),
          withTiming(0,   { duration: flashDuration * 0.7, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: flashDuration * 0.25 }),
          withTiming(0,   { duration: flashDuration * 0.75 }),
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:  opacity.value,
  }));

  // 4-point star shape using two overlapping rectangles
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left:     x - baseSize * 2,
          top:      y  - baseSize * 0.5,
          width:    baseSize * 4,
          height:   baseSize,
          backgroundColor: SPARKLE_COLOR,
          opacity:  0.7,
        },
        animatedStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left:     -(baseSize * 0.5),
            top:      -(baseSize * 1.5),
            width:    baseSize,
            height:   baseSize * 4,
            backgroundColor: SPARKLE_COLOR,
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedParticles — container
// ─────────────────────────────────────────────────────────────────────────────

export default function AnimatedParticles() {
  const { isDark } = useAppTheme();
  const accentColor = isDark ? PURPLE_COLORS[0] : 'rgba(124, 58, 237, 0.45)';

  const bubbles   = useMemo(() => Array.from({ length: BUBBLE_COUNT },   (_, i) => i), []);
  const stars     = useMemo(() => Array.from({ length: STAR_COUNT },     (_, i) => i), []);
  const sparkles  = useMemo(() => Array.from({ length: SPARKLE_COUNT },  (_, i) => i), []);

  const getBubbleColor = (i: number) =>
    isDark ? PURPLE_COLORS[i % PURPLE_COLORS.length] : accentColor;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Bubbles */}
      {bubbles.map((_, i) => (
        <Bubble key={`bubble-${i}`} index={i} color={getBubbleColor(i)} />
      ))}
      {/* Stars */}
      {stars.map((_, i) => (
        <Star key={`star-${i}`} index={i} />
      ))}
      {/* Sparkles */}
      {sparkles.map((_, i) => (
        <Sparkle key={`sparkle-${i}`} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
});