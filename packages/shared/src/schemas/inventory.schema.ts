import { z } from 'zod';
import { ConfidenceLevel, ExtractionType } from '../enums';

export const CandidateInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  brand: z.string().min(1).max(100).optional(),
  confidence: z.nativeEnum(ConfidenceLevel),
  rawText: z.string().optional(),
});

export type CandidateInventoryItemSchemaType = z.infer<typeof CandidateInventoryItemSchema>;

export const AddInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  brand: z.string().min(1).max(100).optional(),
  expiryEstimate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date YYYY-MM-DD')
    .optional(),
  confidence: z.nativeEnum(ConfidenceLevel),
  sourceType: z.nativeEnum(ExtractionType),
  sourceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type AddInventoryItemSchemaType = z.infer<typeof AddInventoryItemSchema>;

export const AddInventoryItemsSchema = z.object({
  items: z.array(AddInventoryItemSchema).min(1).max(50),
});

export type AddInventoryItemsSchemaType = z.infer<typeof AddInventoryItemsSchema>;
