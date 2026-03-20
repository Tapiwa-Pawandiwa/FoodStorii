export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MediaUpload {
  id: string;
  householdId: string;
  userId: string;
  storageKey: string;
  publicUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadType: 'receipt' | 'food_photo' | 'other';
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}
