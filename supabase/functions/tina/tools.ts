// Tool definitions for Tina — passed directly to OpenAI chat completions.
// These are plain JSON-schema objects; no OpenAI SDK types needed here.

export const TINA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_household_profile',
      description:
        'Retrieve the current household profile including dietary preferences, cooking style, health goals, store preferences, onboarding status, and notification settings. Call this at the start of most conversations to ground your responses in what you know about this household.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_household_profile',
      description:
        'Persist updated household profile data. Call this whenever the user shares or confirms information about their household — size, dietary preferences, health goals, store preferences, cooking style, food waste pain points, notification tolerance, automation readiness, or onboarding status. Always persist what you learn; do not hold it only in conversation memory.',
      parameters: {
        type: 'object',
        properties: {
          householdSize: { type: 'number', description: 'Number of people in the household (integer, 1–20)', minimum: 1, maximum: 20 },
          cookingStyle: { type: 'array', items: { type: 'string' }, description: "Cooking style tags, e.g. ['quick_meals', 'batch_cooking', 'from_scratch', 'minimal_cooking']" },
          dietaryPreferences: { type: 'array', items: { type: 'string' }, description: "Dietary preferences/restrictions, e.g. ['vegetarian', 'gluten_free', 'dairy_free', 'halal', 'kosher']" },
          healthGoals: { type: 'array', items: { type: 'string' }, description: "Health goals, e.g. ['high_protein', 'low_sugar', 'low_carb', 'weight_loss', 'balanced_diet']" },
          storePreferences: { type: 'array', items: { type: 'string' }, description: "Preferred grocery stores/retailers, e.g. ['Checkers', 'Woolworths', 'Pick n Pay']" },
          foodWastePainPoints: { type: 'array', items: { type: 'string' }, description: "What food waste issues they struggle with, e.g. ['forgetting expiry dates', 'buying duplicates', 'produce going bad']" },
          notificationTolerance: { type: 'string', enum: ['minimal', 'moderate', 'generous'], description: 'How many notifications the household is comfortable receiving' },
          automationReadiness: { type: 'string', enum: ['manual_only', 'suggestions_ok', 'full_auto'], description: 'How much automation the household wants from Tina' },
          onboardingStatus: { type: 'string', enum: ['not_started', 'in_progress', 'completed'], description: 'Current onboarding progress status' },
          primaryDriver: { type: 'string', enum: ['saving_money', 'improving_health', 'pure_convenience'], description: "The household's primary motivation for using FoodStorii" },
          decisionHour: { type: 'string', description: "Time of day the household starts thinking about dinner, in HH:MM format (e.g. '17:00')" },
          avoidIngredients: { type: 'array', items: { type: 'string' }, description: "Ingredients the household wants to avoid, e.g. ['pork', 'shellfish', 'nuts']" },
          pickyEaters: { type: 'boolean', description: 'Whether the household has picky eaters who are selective about food' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory_snapshot',
      description:
        'Get the current state of all inventory items for this household. Returns all items, items expiring within 3 days, and items awaiting confirmation. Always call this before making recipe suggestions or commenting on what the household has.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_inventory_items',
      description:
        'Add one or more items to the household inventory. Use this when the user mentions food they have, when you extract items from a receipt or photo, or when they manually tell you what is in their pantry. Always assign the appropriate confidence level.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of inventory items to add',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name, e.g. "Full cream milk"' },
                category: { type: 'string', description: 'Category, e.g. "dairy", "produce", "protein", "pantry", "frozen", "beverages"' },
                quantity: { type: 'number', description: 'Numeric quantity' },
                unit: { type: 'string', description: 'Unit, e.g. "litres", "kg", "g", "items", "packs"' },
                brand: { type: 'string', description: 'Brand name if known' },
                expiryEstimate: { type: 'string', description: 'Estimated expiry date in ISO format YYYY-MM-DD' },
                confidence: {
                  type: 'string',
                  enum: ['confirmed', 'inferred_high_confidence', 'inferred_low_confidence', 'user_stated_preference', 'temporary_session_context', 'pending_confirmation'],
                  description: 'Confidence level for this item',
                },
                notes: { type: 'string', description: 'Any additional notes about this item' },
              },
              required: ['name', 'confidence'],
            },
            minItems: 1,
            maxItems: 50,
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reconcile_extraction_items',
      description:
        'After presenting extracted items (from receipt or photo) to the user for review, call this to confirm which items to keep and which to reject.',
      parameters: {
        type: 'object',
        properties: {
          extractionId: { type: 'string', description: 'The ID of the extraction result being reconciled' },
          confirmedItems: {
            type: 'array',
            description: 'Items the user confirmed (possibly with corrections)',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                brand: { type: 'string' },
                expiryEstimate: { type: 'string' },
                confidence: { type: 'string', enum: ['confirmed', 'inferred_high_confidence', 'inferred_low_confidence', 'pending_confirmation'] },
              },
              required: ['name', 'confidence'],
            },
          },
          rejectedItemIds: { type: 'array', items: { type: 'string' }, description: 'Names or identifiers of items the user rejected' },
        },
        required: ['extractionId', 'confirmedItems', 'rejectedItemIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_recipes_by_inventory',
      description:
        'Find recipes the household can make based on their current inventory. Always check inventory first. Use this when the user asks what they can cook, or when suggesting recipes proactively.',
      parameters: {
        type: 'object',
        properties: {
          maxMissingIngredients: { type: 'number', description: 'Maximum number of missing ingredients to allow (0 = can make now, default 3)', minimum: 0, maximum: 10 },
          maxPrepMinutes: { type: 'number', description: 'Maximum total prep + cook time in minutes', minimum: 5 },
          preferredTags: { type: 'array', items: { type: 'string' }, description: "Filter by tags, e.g. ['high_protein', 'quick', 'family_friendly']" },
          limit: { type: 'number', description: 'Maximum number of suggestions to return (default 5)', minimum: 1, maximum: 20 },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_shopping_list',
      description:
        'Create a shopping list for the household. Use this when the user asks to build a shopping list, or when a recipe is missing ingredients that should be purchased.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for the shopping list' },
          items: {
            type: 'array',
            description: 'Items to add to the list',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                category: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['name'],
            },
            minItems: 1,
          },
          recipeId: { type: 'string', description: 'Optional: the recipe this shopping list is for' },
        },
        required: ['title', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_interaction_event',
      description:
        'Log a significant interaction event for audit purposes and memory recall. Use this for meaningful moments: onboarding milestones, confirmed preferences, major inventory changes, user feedback, nudge responses.',
      parameters: {
        type: 'object',
        properties: {
          eventType: { type: 'string', description: 'Type of event, e.g. "onboarding_step_completed", "preference_confirmed", "inventory_updated"' },
          payload: { type: 'object', description: 'Arbitrary JSON payload with event details', additionalProperties: true },
        },
        required: ['eventType', 'payload'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_nudge',
      description:
        'Schedule a proactive notification to be sent to the household at a future time.',
      parameters: {
        type: 'object',
        properties: {
          nudgeType: { type: 'string', description: 'Type of nudge, e.g. "expiry_warning", "restock_reminder", "recipe_suggestion"' },
          title: { type: 'string', description: 'Short notification title (max 60 characters)', maxLength: 60 },
          body: { type: 'string', description: 'Notification body text (max 200 characters)', maxLength: 200 },
          scheduledFor: { type: 'string', description: 'ISO 8601 datetime string for when to send this nudge' },
        },
        required: ['nudgeType', 'title', 'body'],
      },
    },
  },
];
