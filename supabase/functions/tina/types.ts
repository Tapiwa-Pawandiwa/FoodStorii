// Enums and types inlined from @foodstorii/shared.
// Monorepo packages cannot be imported inside Supabase Edge Functions.

export const ConversationMode = {
  onboarding: 'onboarding',
  inventory: 'inventory',
  recipe: 'recipe',
  shopping: 'shopping',
  proactive: 'proactive',
  general: 'general',
} as const;
export type ConversationMode = typeof ConversationMode[keyof typeof ConversationMode];

export const InventoryItemStatus = {
  available: 'available',
  low: 'low',
  expired: 'expired',
  consumed: 'consumed',
  pending_confirmation: 'pending_confirmation',
} as const;
export type InventoryItemStatus = typeof InventoryItemStatus[keyof typeof InventoryItemStatus];

export const ShoppingListStatus = {
  draft: 'draft',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type ShoppingListStatus = typeof ShoppingListStatus[keyof typeof ShoppingListStatus];

export const ShoppingListItemStatus = {
  pending: 'pending',
  checked: 'checked',
  skipped: 'skipped',
} as const;
export type ShoppingListItemStatus = typeof ShoppingListItemStatus[keyof typeof ShoppingListItemStatus];

export const NudgeStatus = {
  pending: 'pending',
  sent: 'sent',
  dismissed: 'dismissed',
} as const;
export type NudgeStatus = typeof NudgeStatus[keyof typeof NudgeStatus];

export const OnboardingStatus = {
  not_started: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
} as const;
export type OnboardingStatus = typeof OnboardingStatus[keyof typeof OnboardingStatus];

export const ExtractionType = {
  receipt_ocr: 'receipt_ocr',
  food_photo: 'food_photo',
  manual: 'manual',
} as const;
export type ExtractionType = typeof ExtractionType[keyof typeof ExtractionType];

// ---- Request / response shapes ----

export interface ChatRequest {
  householdId: string;
  userId: string;
  message: string;
  conversationId?: string;
  mode?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  mode: string;
  actions: TinaAction[];
  suggestedQuickReplies: string[];
}

export interface TinaAction {
  type: string;
  payload: Record<string, unknown>;
}
