import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';

const { width: W, height: H } = Dimensions.get('window');

// ── Slides ────────────────────────────────────────────────────────────────────

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
  {
    key: '4',
    image: require('../../assets/onboarding/green_salad.jpg'),
    headline: 'Cook together\nas a household',
    body: 'Plan meals, share shopping lists, and reduce waste as a team.',
  },
];

export default function SlidesScreen() {
  const { markSlidesSeen } = useAuthStore();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  function handleNext() {
    if (isLast) {
      goToGoals();
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

  async function goToGoals() {
    await markSlidesSeen();
    router.replace('/(onboarding)/goals');
  }

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen photo slides */}
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
          <ImageBackground source={item.image} style={S.slide} resizeMode="cover" />
        )}
      />

      {/* Text overlay — fixed position, bottom-left */}
      <View style={S.textBlock} pointerEvents="none">
        <Text style={S.headline}>{SLIDES[index].headline}</Text>
        <Text style={S.body}>{SLIDES[index].body}</Text>
      </View>

      {/* Progress dots */}
      <View style={S.dots} pointerEvents="none">
        {SLIDES.map((_, i) => (
          <View key={i} style={[S.dot, i === index ? S.dotActive : S.dotInactive]} />
        ))}
      </View>

      {/* Button */}
      <View style={S.footer}>
        <TouchableOpacity style={S.btn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={S.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  slide: { width: W, height: H },

  textBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 210,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 38,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  dots: {
    position: 'absolute',
    bottom: 162,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: '#FFFFFF' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.45)' },

  footer: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    right: 24,
  },
  btn: {
    backgroundColor: '#48A111',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
