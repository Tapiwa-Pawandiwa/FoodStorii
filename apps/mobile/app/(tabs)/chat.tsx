import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { streamTinaChat } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors, spacing, typography, radius, shadows, TAB_BAR_BOTTOM_PADDING } from '../../src/theme';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function getOrCreateThreadId(householdId: string): Promise<string> {
  const key = `fs_thread_id_${householdId}`;
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = genId();
  await AsyncStorage.setItem(key, id);
  return id;
}

// ── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[S.bubbleRow, isUser && S.bubbleRowUser]}>
      {!isUser && (
        <View style={S.avatar}>
          <Text style={S.avatarText}>T</Text>
        </View>
      )}
      <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleAssistant, message.isError && S.bubbleError]}>
        <Text style={[S.bubbleText, isUser && S.bubbleTextUser]}>
          {message.content}
          {message.isStreaming && <Text style={S.cursor}>▋</Text>}
        </Text>
      </View>
    </View>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <View style={S.bubbleRow}>
      <View style={S.avatar}>
        <Text style={S.avatarText}>T</Text>
      </View>
      <View style={[S.bubble, S.bubbleAssistant, S.thinkingBubble]}>
        <ActivityIndicator size="small" color={colors.brand.green} />
        <Text style={S.thinkingText}>Thinking…</Text>
      </View>
    </View>
  );
}

// ── Quick reply chips ─────────────────────────────────────────────────────────

function QuickReplies({ replies, onSelect }: { replies: string[]; onSelect: (r: string) => void }) {
  if (!replies.length) return null;
  return (
    <View style={S.quickRepliesRow}>
      {replies.map((r) => (
        <TouchableOpacity key={r} style={S.chip} onPress={() => onSelect(r)} activeOpacity={0.75}>
          <Text style={S.chipText} numberOfLines={1}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Welcome back — what can I help with today?',
};

export default function ChatScreen() {
  const { accessToken, householdId } = useAuthStore();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (householdId) {
      getOrCreateThreadId(householdId).then(setThreadId);
    }
  }, [householdId]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !threadId || !householdId || !accessToken || isSending) return;

    const userMsg: Message = { id: genId(), role: 'user', content: trimmed };
    const assistantId = genId();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setQuickReplies([]);
    setIsSending(true);
    scrollToEnd();

    try {
      for await (const event of streamTinaChat(trimmed, threadId, householdId, accessToken)) {
        if (event.type === 'token') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.content } : m))
          );
          scrollToEnd();
        } else if (event.type === 'tool_start') {
          setIsThinking(true);
        } else if (event.type === 'tool_end') {
          setIsThinking(false);
        } else if (event.type === 'done') {
          setIsThinking(false);
          const chips: string[] = event.quick_replies || [];
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
          );
          setQuickReplies(chips);
          scrollToEnd();
        } else if (event.type === 'error') {
          setIsThinking(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: event.content || 'Something went wrong. Please try again.', isStreaming: false, isError: true }
                : m
            )
          );
        }
      }
    } catch {
      setIsThinking(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false, isError: true }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [threadId, householdId, accessToken, isSending, scrollToEnd]);

  const handleSend = useCallback(() => send(input), [send, input]);
  const handleQuickReply = useCallback((r: string) => send(r), [send]);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <View style={S.headerAvatar}>
          <Text style={S.headerAvatarText}>T</Text>
        </View>
        <View>
          <Text style={S.headerName}>Tina</Text>
          <Text style={S.headerSub}>Your kitchen assistant</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble message={item} />}
          contentContainerStyle={S.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={isThinking ? <ThinkingIndicator /> : null}
        />

        {/* Quick reply chips */}
        <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />

        {/* Input bar */}
        <View style={S.inputBar}>
          <TextInput
            style={S.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message Tina…"
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[S.sendBtn, (!input.trim() || isSending) && S.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: colors.white,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  headerName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerSub: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },

  // Bubble
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleAssistant: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.sm,
    ...shadows.sm,
  },
  bubbleUser: {
    backgroundColor: colors.brand.green,
    borderBottomRightRadius: radius.sm,
  },
  bubbleError: {
    backgroundColor: colors.red[50],
    borderWidth: 1,
    borderColor: colors.red[100],
  },
  bubbleText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: typography.size.base * 1.45,
  },
  bubbleTextUser: {
    color: colors.white,
  },
  cursor: {
    color: colors.brand.green,
    opacity: 0.6,
  },

  // Thinking
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  thinkingText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },

  // Quick replies
  quickRepliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand.green,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    maxWidth: 200,
    ...shadows.sm,
  },
  chipText: {
    fontSize: typography.size.sm,
    color: colors.brand.green,
    fontWeight: typography.weight.semibold,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: TAB_BAR_BOTTOM_PADDING - 60,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.gray[50],
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.size.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendBtnDisabled: {
    backgroundColor: colors.gray[200],
  },
});
