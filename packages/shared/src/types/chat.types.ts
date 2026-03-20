import { MessageRole, ConversationMode } from '../enums';

export interface Conversation {
  id: string;
  householdId: string;
  userId: string;
  mode: ConversationMode;
  summary: string | null;
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCallId: string | null;
  toolName: string | null;
  toolInput: Record<string, unknown> | null;
  toolOutput: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  householdId: string;
  userId: string;
  message: string;
  mode?: ConversationMode;
  attachmentId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  mode: ConversationMode;
  actions?: TinaAction[];
  suggestedQuickReplies?: string[];
}

export interface TinaAction {
  type:
    | 'profile_updated'
    | 'inventory_updated'
    | 'recipe_suggested'
    | 'shopping_list_updated'
    | 'nudge_scheduled';
  payload: Record<string, unknown>;
}
