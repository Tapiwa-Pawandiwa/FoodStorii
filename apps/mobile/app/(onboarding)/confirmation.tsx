import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmationScreen() {
  const scale = new Animated.Value(0);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Navigate to tabs after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={S.root}>
      <SafeAreaView style={S.inner}>
        <Animated.View style={[S.content, { opacity, transform: [{ scale }] }]}>
          {/* Tina avatar */}
          <View style={S.avatar}>
            <Text style={S.avatarIcon}>✦</Text>
          </View>

          {/* Checkmark ring */}
          <View style={S.checkRing}>
            <Text style={S.checkMark}>✓</Text>
          </View>

          <Text style={S.done}>Done.</Text>
          <Text style={S.sub}>I'll keep your kitchen updated from here.</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#25671E',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#48A111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarIcon: {
    fontSize: 32,
    color: '#FFFFFF',
  },

  checkRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#F7F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 36,
    color: '#F7F0F0',
    fontWeight: '700',
  },

  done: {
    fontSize: 56,
    fontWeight: '700',
    color: '#F7F0F0',
    marginTop: 4,
  },
  sub: {
    fontSize: 16,
    color: 'rgba(247,240,240,0.65)',
    textAlign: 'center',
    lineHeight: 23,
  },
});
