import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Image,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors, spacing, typography, radius } from '../../src/theme';

const { width: W, height: H } = Dimensions.get('window');

// ── Assets ───────────────────────────────────────────────────────────────────

const LOGO = require('../../assets/FOODSTORII.png');

const SLIDES = [
  {
    key: '1',
    image: require('../../assets/onboarding/cooking2.jpg'),
    headline: 'Cook with what\nyou have',
    body: 'Get personalised recipes based on your ingredients',
  },
  {
    key: '2',
    image: require('../../assets/onboarding/shop.jpg'),
    headline: 'Smart Shopping\nLists',
    body: "Know what's missing, never forget an ingredient and buy what you need. Plan ahead.",
  },
  {
    key: '3',
    image: require('../../assets/onboarding/bin.jpg'),
    headline: 'Eat better,\nWaste less',
    body: "Reduce food waste by up to 70% with Tina's help",
  },
];

// ── Splash screen ─────────────────────────────────────────────────────────────

function Splash({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <ImageBackground
      source={require('../../assets/onboarding/green_salad.jpg')}
      style={S.fullScreen}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      {/* Dark overlay */}
      <View style={S.overlay} />

      {/* Logo centred */}
      <View style={S.splashLogoWrap}>
        <Image source={LOGO} style={S.splashLogo} resizeMode="contain" />
      </View>

      {/* Bottom content */}
      <View style={S.splashBottom}>
        <Text style={S.splashHeadline}>Your kitchen.{'\n'}Actually organised.</Text>
        <Text style={S.splashSub}>Save money, waste less, eat better.</Text>

        <TouchableOpacity style={S.primaryBtn} onPress={onGetStarted} activeOpacity={0.88}>
          <Text style={S.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSignIn} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
          <Text style={S.signInLink}>Already have an account? <Text style={S.signInLinkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

// ── Feature slides ────────────────────────────────────────────────────────────

function Slides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  function handleNext() {
    if (isLast) {
      onDone();
    } else {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }
  }

  function onMomentumScrollEnd(e: any) {
    const i = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(i);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <ImageBackground source={item.image} style={S.slide} resizeMode="cover">
            {/* Gradient overlay */}
            <View style={S.slideOverlayTop} />
            <View style={S.slideOverlayBottom} />
          </ImageBackground>
        )}
      />

      {/* Text overlay — rendered outside FlatList so it stays fixed */}
      <View style={S.slideTextBlock} pointerEvents="none">
        <Text style={S.slideHeadline}>{SLIDES[index].headline}</Text>
        <Text style={S.slideBody}>{SLIDES[index].body}</Text>
      </View>

      {/* Dots */}
      <View style={S.dots} pointerEvents="none">
        {SLIDES.map((_, i) => (
          <View key={i} style={[S.dot, i === index ? S.dotActive : S.dotInactive]} />
        ))}
      </View>

      {/* Button */}
      <View style={S.slideFooter}>
        <TouchableOpacity style={S.primaryBtn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={S.primaryBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function SlidesScreen() {
  const { markSlidesSeen } = useAuthStore();
  const [phase, setPhase] = useState<'splash' | 'slides'>('splash');

  async function goToSignUp() {
    await markSlidesSeen();
    router.replace('/(auth)/signup');
  }

  async function goToSignIn() {
    await markSlidesSeen();
    router.replace('/(auth)/signin');
  }

  if (phase === 'splash') {
    return (
      <Splash
        onGetStarted={() => setPhase('slides')}
        onSignIn={goToSignIn}
      />
    );
  }

  return <Slides onDone={goToSignUp} />;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  fullScreen: { flex: 1, width: W, height: H },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  // Splash
  splashLogoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: 60,
  },
  splashLogo: {
    width: 280,
    height: 80,
  },
  splashBottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 56,
    gap: spacing.md,
  },
  splashHeadline: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.white,
    lineHeight: typography.size['3xl'] * 1.2,
    marginBottom: spacing.xs,
  },
  splashSub: {
    fontSize: typography.size.base,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: typography.size.base * 1.5,
    marginBottom: spacing.sm,
  },

  // Slides
  slide: {
    width: W,
    height: H,
  },
  slideOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  slideOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  slideTextBlock: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 220,
    gap: spacing.sm,
  },
  slideHeadline: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.white,
    lineHeight: typography.size['3xl'] * 1.2,
  },
  slideBody: {
    fontSize: typography.size.base,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: typography.size.base * 1.55,
    marginTop: spacing.xs,
  },
  dots: {
    position: 'absolute',
    bottom: 175,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: colors.white },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
  slideFooter: {
    position: 'absolute',
    bottom: 56,
    left: spacing.xl,
    right: spacing.xl,
  },

  // Shared button
  primaryBtn: {
    backgroundColor: colors.brand.green,
    borderRadius: radius.lg,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  signInLink: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  signInLinkBold: {
    color: colors.white,
    fontWeight: typography.weight.semibold,
  },
});
