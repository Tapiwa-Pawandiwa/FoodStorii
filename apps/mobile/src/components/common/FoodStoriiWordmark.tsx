import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** 'light' = white logo (for dark backgrounds), 'dark' = dark tinted logo (for light backgrounds) */
  variant?: 'light' | 'dark';
}

const SIZES = {
  sm: { width: 140, height: 40 },
  md: { width: 180, height: 52 },
  lg: { width: 220, height: 64 },
};

export function FoodStoriiWordmark({ size = 'md', variant = 'dark' }: Props) {
  const { width, height } = SIZES[size];
  return (
    <Image
      source={require('../../../assets/FOODSTORII.png')}
      style={[
        styles.logo,
        { width, height },
        variant === 'dark' && styles.darkTint,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
  // Tint the white logo dark so it's visible on white/light backgrounds
  darkTint: { tintColor: '#111111' },
});
