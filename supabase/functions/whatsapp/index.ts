import { createInternalClient } from '../_shared/client.ts';
import { handleChat } from '../tina/orchestrator.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function twiml(message: string): Response {
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${safe}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function isTwilioRequest(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): Promise<boolean> {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const raw = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(url + sorted));
  const computed = btoa(String.fromCharCode(...new Uint8Array(raw)));
  return computed === signature;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  console.log('[whatsapp] env check | TWILIO_AUTH_TOKEN:', !!Deno.env.get('TWILIO_AUTH_TOKEN'), '| TWILIO_WEBHOOK_URL:', !!Deno.env.get('TWILIO_WEBHOOK_URL'), '| OPENAI_API_KEY:', !!Deno.env.get('OPENAI_API_KEY'), '| SUPABASE_URL:', !!Deno.env.get('SUPABASE_URL'), '| INTERNAL_KEY:', !!Deno.env.get('INTERNAL_KEY'));

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
  const skipValidation = Deno.env.get('TWILIO_SKIP_VALIDATION') === 'true';
  const webhookUrl = Deno.env.get('TWILIO_WEBHOOK_URL') ?? '';

  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const from = params['From'];
  const messageBody = params['Body']?.trim();
  const phoneNumber = from?.replace(/^whatsapp:/i, '') ?? '';

  console.log(`[whatsapp] ← received | from: ${phoneNumber} | body: "${messageBody?.slice(0, 80)}"`);

  // Signature validation (skip in sandbox)
  if (!skipValidation) {
    const signature = req.headers.get('X-Twilio-Signature') ?? '';
    const valid = await isTwilioRequest(authToken, webhookUrl, params, signature);
    if (!valid) {
      console.warn('[whatsapp] ✗ invalid Twilio signature — rejected');
      return new Response('Forbidden', { status: 403 });
    }
    console.log('[whatsapp] ✓ signature valid');
  } else {
    console.log('[whatsapp] ⚠ signature validation skipped (sandbox mode)');
  }

  if (!from || !messageBody) {
    console.warn('[whatsapp] ✗ missing From or Body');
    return twiml("I didn't catch that — could you send a message?");
  }

  // Internal client for server-to-server DB operations (no user JWT).
  // Requires INTERNAL_KEY secret (new sb_secret_* format key).
  const supabase = createInternalClient();

  // --- Sandbox join confirmation ---
  if (/^join\s+\S/i.test(messageBody)) {
    console.log('[whatsapp] → detected sandbox join message');
    return twiml(
      "👋 Welcome to FoodStorii! I'm Tina, your household food assistant.\n\n" +
      "To connect your account, open the FoodStorii app and tap *Link WhatsApp* — " +
      "it takes one tap and you'll be all set. 🥗",
    );
  }

  // --- One-tap account linking ---
  const linkMatch = messageBody.match(/^link\s+([A-Z0-9]{6})$/i);
  if (linkMatch) {
    const token = linkMatch[1].toUpperCase();
    console.log(`[whatsapp] → detected link token: ${token}`);

    const { data: tokenRow, error: tokenError } = await supabase
      .from('whatsapp_link_tokens')
      .select('household_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      console.warn(`[whatsapp] ✗ token not found: ${token}`);
      return twiml(
        "That code doesn't look right or has expired. Open the FoodStorii app and tap *Link WhatsApp* to get a fresh one.",
      );
    }

    if (tokenRow.used_at) {
      console.warn(`[whatsapp] ✗ token already used: ${token}`);
      return twiml("That code has already been used. You're already linked — just send me a message! 🎉");
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      console.warn(`[whatsapp] ✗ token expired: ${token}`);
      return twiml(
        "That code has expired (they last 30 minutes). Open the FoodStorii app and tap *Link WhatsApp* to get a new one.",
      );
    }

    const householdId = tokenRow.household_id as string;

    await Promise.all([
      supabase
        .from('household_profiles')
        .update({ whatsapp_number: phoneNumber })
        .eq('household_id', householdId),
      supabase
        .from('whatsapp_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token),
    ]);

    console.log(`[whatsapp] ✓ linked phone ${phoneNumber} → household ${householdId}`);

    const { data: userRow } = await supabase
      .from('users')
      .select('display_name')
      .eq('household_id', householdId)
      .limit(1)
      .single();

    const name = (userRow?.display_name as string | null)?.split(' ')[0] ?? 'there';

    return twiml(
      `You're all linked up, ${name}! 🎉\n\n` +
      "I'm Tina — I'll help you reduce food waste, decide what to cook, and keep your shopping on track.\n\n" +
      "You can ask me anything: *what should I cook tonight?*, *what can I make with chicken and rice?*, " +
      "*add milk to my shopping list*, or just say hello.\n\n" +
      "What's on your mind? 🥗",
    );
  }

  // --- Route message to Tina ---
  console.log(`[whatsapp] → looking up household for phone: ${phoneNumber}`);

  const { data: profile, error: profileError } = await supabase
    .from('household_profiles')
    .select('household_id')
    .eq('whatsapp_number', phoneNumber)
    .single();

  if (profileError || !profile?.household_id) {
    console.warn(`[whatsapp] ✗ no household found for ${phoneNumber}`);
    return twiml(
      "Hi! I'm Tina 👋\n\n" +
      "To get started, open the FoodStorii app and tap *Link WhatsApp* on the home screen. " +
      "It only takes a second!",
    );
  }

  const householdId = profile.household_id as string;
  console.log(`[whatsapp] ✓ household found: ${householdId}`);

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('household_id', householdId)
    .limit(1)
    .single();

  if (userError || !userRow?.id) {
    console.error(`[whatsapp] ✗ no user found for household: ${householdId}`);
    return twiml("I couldn't verify your account — please check the FoodStorii app.");
  }

  const userId = userRow.id as string;

  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('household_id', householdId)
    .eq('source', 'whatsapp')
    .order('last_active_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const conversationId = existingConv?.id as string | undefined;
  console.log(`[whatsapp] conversation: ${conversationId ?? 'none (will create new)'}`);

  console.log(`[whatsapp] → calling Tina | household: ${householdId} | user: ${userId}`);
  console.log(`[whatsapp] OPENAI_API_KEY env present: ${!!Deno.env.get('OPENAI_API_KEY')}`);

  try {
    const result = await handleChat(
      { householdId, userId, message: messageBody, conversationId, mode: 'general', source: 'whatsapp' },
      supabase,
    );

    console.log(`[whatsapp] ✓ Tina replied (${result.reply.length} chars): "${result.reply.slice(0, 120)}"`);
    return twiml(result.reply);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const status = (err as Record<string, unknown>)?.status;
    const code = (err as Record<string, unknown>)?.code;
    console.error(`[whatsapp] ✗ handleChat error | status: ${status} | code: ${code} | message: ${msg}`);
    if (stack) console.error(`[whatsapp] stack: ${stack}`);
    return twiml("I had a bit of trouble with that — could you try again?");
  }
});
