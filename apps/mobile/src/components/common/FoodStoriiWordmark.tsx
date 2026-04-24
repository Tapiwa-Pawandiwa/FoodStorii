import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { fontSize: 20, letterSpacing: 2 },
  md: { fontSize: 28, letterSpacing: 3 },
  lg: { fontSize: 36, letterSpacing: 4 },
};

export function FoodStoriiWordmark({ size = 'md' }: Props) {
  const { fontSize, letterSpacing } = SIZES[size];
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { fontSize, letterSpacing }]}>FOODSTOR</Text>
      <Text style={[styles.text, styles.accent, { fontSize, letterSpacing }]}>II</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  text: { fontWeight: '700', color: '#111111' },
  accent: { color: '#548c2f' },
});
