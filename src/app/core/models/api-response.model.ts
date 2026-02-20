// src/app/core/models/api-response.model.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: Record<string, unknown> | null;
  message: string;
  errors: string[] | null;
  trace_id: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}