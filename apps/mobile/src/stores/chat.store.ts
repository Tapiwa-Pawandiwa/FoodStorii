import { create } from 'zustand';
import type { TinaAction } from '@foodstorii/shared';
import { ConversationMode } from '@foodstorii/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  actions?: TinaAction[];
}

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  mode: ConversationMode;
  suggestedReplies: string[];
  isLoading: boolean;
  addUserMessage: (content: string) => string;
  addAssistantMessage: (id: string, content: string, actions?: TinaAction[], replies?: string[]) => void;
  setLoading: (loading: boolean) => void;
  setConversationId: (id: string) => void;
  setMode: (mode: ConversationMode) => void;
  reset: () => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversationId: null,
  mode: ConversationMode.general,
  suggestedReplies: [],
  isLoading: false,

  addUserMessage: (content) => {
    const id = `msg_${++msgCounter}`;
    set((state) => ({
      messages: [...state.messages, { id, role: 'user', content, createdAt: new Date() }],
      suggestedReplies: [],
    }));
    return id;
  },

  addAssistantMessage: (id, content, actions, replies) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'assistant', content, createdAt: new Date(), actions },
      ],
      suggestedReplies: replies ?? [],
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setConversationId: (id) => set({ conversationId: id }),
  setMode: (mode) => set({ mode }),
  reset: () => set({ messages: [], conversationId: null, suggestedReplies: [], isLoading: false }),
}));
