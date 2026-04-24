import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodStoriiWordmark } from '../../src/components/common/FoodStoriiWordmark';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors, spacing, typography } from '../../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES: { key: string; icon: keyof typeof Ionicons.glyphMap; headline: string; body: string }[] = [
  {
    key: '1',
    icon: 'cube-outline',
    headline: 'Know what you have',
    body: "Stop guessing what's in your fridge. Tina tracks your pantry so nothing gets forgotten.",
  },
  {
    key: '2',
    icon: 'leaf-outline',
    headline: 'Waste less, every week',
    body: "Get a heads-up before things expire. Use what you have before it's gone.",
  },
  {
    key: '3',
    icon: 'restaurant-outline',
    headline: "Cook with what's there",
    body: 'Recipes matched to your actual ingredients — not a shopping list in disguise.',
  },
  {
    key: '4',
    icon: 'cart-outline',
    headline: 'Shop with a plan',
    body: 'Shopping lists built around what you actually need. No more duplicates or forgotten items.',
  },
];

export default function SlidesScreen() {
  const { markSlidesSeen } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleSkip = async () => {
    await markSlidesSeen();
    router.replace('/(welcome)/join');
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await markSlidesSeen();
      router.replace('/(welcome)/join');
    }
  };

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <FoodStoriiWordmark size="sm" />
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.illustrationArea}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={80} color={colors.green[600]} />
              </View>
            </View>
            <View style={styles.textArea}>
              <Text style={styles.headline}>{item.headline}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  skipText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  headline: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: typography.size.base * 1.6,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.xl,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.green[600],
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.green[200],
  },
  nextButton: {
    backgroundColor: colors.green[600],
    borderRadius: 14,
    paddingVertical: spacing.base,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.white,
  },
});
