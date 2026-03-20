import { z } from 'zod';
import { NotificationTolerance, AutomationReadiness, OnboardingStatus, PrimaryDriver } from '../enums';

export const UpdateHouseholdProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20).optional(),
  cookingStyle: z
    .array(z.string().min(1))
    .optional(),
  dietaryPreferences: z
    .array(z.string().min(1))
    .optional(),
  healthGoals: z
    .array(z.string().min(1))
    .optional(),
  storePreferences: z
    .array(z.string().min(1))
    .optional(),
  foodWastePainPoints: z
    .array(z.string().min(1))
    .optional(),
  notificationTolerance: z
    .nativeEnum(NotificationTolerance)
    .optional(),
  automationReadiness: z
    .nativeEnum(AutomationReadiness)
    .optional(),
  onboardingStatus: z
    .nativeEnum(OnboardingStatus)
    .optional(),
  primaryDriver: z
    .nativeEnum(PrimaryDriver)
    .optional(),
  decisionHour: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
    .optional(),
  avoidIngredients: z
    .array(z.string().min(1))
    .optional(),
  pickyEaters: z.boolean().optional(),
});

export type UpdateHouseholdProfileSchemaType = z.infer<typeof UpdateHouseholdProfileSchema>;

export const CreateHouseholdSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1).max(100).optional(),
});

export type CreateHouseholdSchemaType = z.infer<typeof CreateHouseholdSchema>;
