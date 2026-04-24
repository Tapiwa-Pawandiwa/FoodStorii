export enum ConfidenceLevel {
  confirmed = 'confirmed',
  inferred_high_confidence = 'inferred_high_confidence',
  inferred_low_confidence = 'inferred_low_confidence',
  user_stated_preference = 'user_stated_preference',
  temporary_session_context = 'temporary_session_context',
  pending_confirmation = 'pending_confirmation',
}

export enum ConversationMode {
  onboarding = 'onboarding',
  inventory = 'inventory',
  recipe = 'recipe',
  shopping = 'shopping',
  proactive = 'proactive',
  general = 'general',
}

export enum MessageRole {
  user = 'user',
  assistant = 'assistant',
  system = 'system',
  tool = 'tool',
}

export enum InventoryItemStatus {
  available = 'available',
  low = 'low',
  expired = 'expired',
  consumed = 'consumed',
  pending_confirmation = 'pending_confirmation',
}

export enum ShoppingListStatus {
  draft = 'draft',
  active = 'active',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum ShoppingListItemStatus {
  pending = 'pending',
  checked = 'checked',
  skipped = 'skipped',
  saved_for_later = 'saved_for_later',
}

export enum MediaUploadStatus {
  uploading = 'uploading',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
}

export enum ExtractionType {
  receipt_ocr = 'receipt_ocr',
  food_photo = 'food_photo',
  manual = 'manual',
}

export enum NudgeStatus {
  pending = 'pending',
  sent = 'sent',
  dismissed = 'dismissed',
}

export enum NotificationTolerance {
  minimal = 'minimal',
  moderate = 'moderate',
  generous = 'generous',
}

export enum AutomationReadiness {
  manual_only = 'manual_only',
  suggestions_ok = 'suggestions_ok',
  full_auto = 'full_auto',
}

export enum OnboardingStatus {
  not_started = 'not_started',
  in_progress = 'in_progress',
  completed = 'completed',
}

export enum PrimaryDriver {
  saving_money = 'saving_money',
  improving_health = 'improving_health',
  pure_convenience = 'pure_convenience',
}
