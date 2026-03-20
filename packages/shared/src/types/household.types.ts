import {
  NotificationTolerance,
  AutomationReadiness,
  OnboardingStatus,
  PrimaryDriver,
} from '../enums';

export interface HouseholdProfile {
  id: string;
  householdId: string;
  householdSize: number | null;
  cookingStyle: string[] | null;
  dietaryPreferences: string[] | null;
  healthGoals: string[] | null;
  storePreferences: string[] | null;
  foodWastePainPoints: string[] | null;
  notificationTolerance: NotificationTolerance | null;
  automationReadiness: AutomationReadiness | null;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt: string | null;
  primaryDriver: PrimaryDriver | null;
  decisionHour: string | null;
  avoidIngredients: string[] | null;
  pickyEaters: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHouseholdProfileInput {
  householdSize?: number;
  cookingStyle?: string[];
  dietaryPreferences?: string[];
  healthGoals?: string[];
  storePreferences?: string[];
  foodWastePainPoints?: string[];
  notificationTolerance?: NotificationTolerance;
  automationReadiness?: AutomationReadiness;
  onboardingStatus?: OnboardingStatus;
  primaryDriver?: PrimaryDriver;
  decisionHour?: string;
  avoidIngredients?: string[];
  pickyEaters?: boolean;
}
