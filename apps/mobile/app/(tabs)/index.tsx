import React, { useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { TypingIndicator } from '../../src/components/chat/TypingIndicator';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { QuickReplies } from '../../src/components/chat/QuickReplies';
import { useChatStore } from '../../src/stores/chat.store';
import { useAuthStore } from '../../src/stores/auth.store';
import * as api from '../../src/services/api';
import { colors, spacing, typography } from '../../src/theme';

export default function ChatScreen() {
  const { householdId, userId } = useAuthStore();
  const {
    messages,
    conversationId,
    isLoading,
    suggestedReplies,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setConversationId,
    setMode,
  } = useChatStore();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, isLoading]);

  async function sendMessage(text: string) {
    console.log(`[Chat] sendMessage called: "${text.slice(0, 80)}" | householdId: ${householdId} | isLoading: ${isLoading}`);
    if (!householdId || !userId || !text.trim()) return;
    addUserMessage(text);
    setLoading(true);

    try {
      console.log(`[Chat] → API sendMessage | conversationId: ${conversationId}`);
      const response = await api.sendMessage({
        conversationId: conversationId ?? undefined,
        householdId,
        userId,
        message: text,
      });

      console.log(`[Chat] ← API response | mode: ${response.mode} | reply length: ${response.reply?.length}`);
      setConversationId(response.conversationId);
      setMode(response.mode);
      addAssistantMessage(response.messageId, response.reply, response.actions, response.suggestedQuickReplies);
    } catch (err) {
      console.error('[Chat] sendMessage failed:', err instanceof Error ? err.message : err);
      addAssistantMessage(`err_${Date.now()}`, "I had a bit of trouble — could you try that again?");
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.tinaAvatar}>
            <Text style={styles.tinaAvatarText}>T</Text>
          </View>
          <View>
            <Text style={styles.tinaName}>Tina</Text>
            <Text style={styles.tinaRole}>Your food assistant</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>What can I help with?</Text>
            <Text style={styles.emptySubtitle}>Ask about your pantry, get recipe ideas, or build a shopping list.</Text>
          </View>
        ) : (
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
        )}

        <QuickReplies
          replies={isEmpty ? ['Check my pantry', 'Suggest a recipe', 'Build a shopping list'] : suggestedReplies}
          onSelect={sendMessage}
        />
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tinaAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinaAvatarText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  tinaName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  tinaRole: { fontSize: typography.size.xs, color: colors.text.tertiary },
  list: { paddingVertical: spacing.base, paddingBottom: spacing.md },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.semibold, color: colors.text.primary, textAlign: 'center' },
  emptySubtitle: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.size.base * 1.6 },
});
