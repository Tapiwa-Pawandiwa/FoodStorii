import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  if (replies.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {replies.map((reply) => (
          <TouchableOpacity
            key={reply}
            onPress={() => {
              console.log(`[QuickReplies] tapped: "${reply}"`);
              onSelect(reply);
            }}
            style={styles.pill}
            activeOpacity={0.7}
          >
            <Text style={styles.label}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingVertical: spacing.sm,
  },
  container: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.green[50],
    borderWidth: 1.5,
    borderColor: colors.green[200],
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.green[700],
  },
});
