import React, { useEffect, useRef, useState } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { TypingIndicator } from '../../src/components/chat/TypingIndicator';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { QuickReplies } from '../../src/components/chat/QuickReplies';
import { useChatStore } from '../../src/stores/chat.store';
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';
import { ConversationMode, OnboardingStatus } from '@foodstorii/shared';
import { colors, spacing, typography } from '../../src/theme';

const GREETING = `You're all set up. I already know a bit about your household — now let's fill in the rest. What's one food challenge you keep running into?`;

const GREETING_REPLIES = [
  'Too much food goes to waste',
  "I never know what to cook",
  'Shopping is chaotic',
  'Eating healthier is hard',
];

export default function OnboardingScreen() {
  const { householdId, userId } = useAuthStore();
  const {
    messages, conversationId, isLoading, suggestedReplies,
    addUserMessage, addAssistantMessage, setLoading, setConversationId, setMode,
  } = useChatStore();
  const listRef = useRef<FlatList>(null);
  const hasGreeted = useRef(false);

  // Clear any stuck loading state and show greeting on first load
  useEffect(() => {
    setLoading(false);
    if (hasGreeted.current || messages.length > 0) return;
    hasGreeted.current = true;
    addAssistantMessage('tina_greeting', GREETING, undefined, GREETING_REPLIES);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isLoading]);

  async function sendMessage(text: string) {
    console.log(`[Onboarding] sendMessage called: "${text.slice(0, 80)}" | householdId: ${householdId} | isLoading: ${isLoading}`);
    if (!text.trim()) return;

    addUserMessage(text);
    setLoading(true);

    if (!householdId || !userId) {
      console.error('[Onboarding] BLOCKED — householdId:', householdId, '| userId:', userId);
      addAssistantMessage(`err_${Date.now()}`, "I can't connect right now. Please sign out and sign back in.");
      setLoading(false);
      return;
    }

    try {
      console.log(`[Onboarding] → API sendMessage | conversationId: ${conversationId}`);
      const response = await api.sendMessage({
        conversationId: conversationId ?? undefined,
        householdId,
        userId,
        message: text,
        mode: ConversationMode.onboarding,
      });

      console.log(`[Onboarding] ← API response | mode: ${response.mode} | reply length: ${response.reply?.length}`);
      setConversationId(response.conversationId);
      setMode(response.mode);
      addAssistantMessage(response.messageId, response.reply, response.actions, response.suggestedQuickReplies);

      const profileAction = response.actions?.find((a) => a.type === 'profile_updated');
      if (profileAction) {
        const profile = profileAction.payload.profile as { onboardingStatus?: string };
        if (profile?.onboardingStatus === OnboardingStatus.completed) {
          setTimeout(() => router.replace('/(tabs)'), 1200);
        }
      }
    } catch (err) {
      console.error('[Onboarding] sendMessage failed:', err instanceof Error ? err.message : err);
      addAssistantMessage(`err_${Date.now()}`, "Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activeSuggestions = messages.length === 1 ? GREETING_REPLIES : suggestedReplies;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.tinaAvatar}>
            <Text style={styles.tinaAvatarText}>T</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Tina</Text>
            <Text style={styles.headerSubtitle}>Setting up your household</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.skipButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
        />

        <QuickReplies replies={activeSuggestions} onSelect={sendMessage} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
        </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray[50] },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tinaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinaAvatarText: { color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  headerTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  headerSubtitle: { fontSize: typography.size.xs, color: colors.text.tertiary },
  skipButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  skipText: { fontSize: typography.size.sm, color: colors.text.tertiary },
  list: { paddingVertical: spacing.base, paddingBottom: spacing.md },
});
