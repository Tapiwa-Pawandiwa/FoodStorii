import { z } from 'zod';
import { ConversationMode } from '../enums';

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  mode: z.nativeEnum(ConversationMode).optional(),
  attachmentId: z.string().uuid().optional(),
});

export type ChatRequestSchemaType = z.infer<typeof ChatRequestSchema>;
