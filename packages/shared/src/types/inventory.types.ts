import { ConfidenceLevel, InventoryItemStatus, ExtractionType } from '../enums';

export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  brand: string | null;
  expiryEstimate: string | null;
  confidence: ConfidenceLevel;
  status: InventoryItemStatus;
  sourceType: ExtractionType;
  sourceId: string | null;
  notes: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddInventoryItemInput {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  brand?: string;
  expiryEstimate?: string;
  confidence: ConfidenceLevel;
  sourceType: ExtractionType;
  sourceId?: string;
  notes?: string;
}

export interface InventorySnapshot {
  items: InventoryItem[];
  totalItems: number;
  expiringWithin3Days: InventoryItem[];
  lowConfidenceItems: InventoryItem[];
  snapshotAt: string;
}

export interface ExtractionResult {
  id: string;
  uploadId: string;
  extractionType: ExtractionType;
  rawOutput: Record<string, unknown>;
  candidateItems: CandidateInventoryItem[];
  confidence: number;
  processedAt: string;
}

export interface CandidateInventoryItem {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  brand?: string;
  confidence: ConfidenceLevel;
  rawText?: string;
}
