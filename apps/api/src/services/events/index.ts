import { supabase } from '../../db/client';

export async function logInteractionEvent(
  householdId: string,
  userId: string,
  conversationId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('interaction_events').insert({
    household_id: householdId,
    user_id: userId,
    conversation_id: conversationId,
    event_type: eventType,
    payload,
  });

  if (error) throw new Error(`Failed to log interaction event: ${error.message}`);
}
