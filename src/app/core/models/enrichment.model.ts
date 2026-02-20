// ---------------------------------------------------------------------------
// POST /api/v1/enrichment/ai/optimize — backend: AITextOptimizationRequest
// ---------------------------------------------------------------------------

export interface AITextOptimizationRequest {
  content: string;
  keywords?: string[];
  fields?: AIEnrichmentTargetField[];
}

export interface AIEnrichmentOutput {
  title?: string | null;
  description?: string | null;
  meta_description?: string | null;
}

export interface AITextOptimizationResponse {
  model_used: string;
  keywords_used: string[];
  output: AIEnrichmentOutput;
}

// ---------------------------------------------------------------------------
// Modelo local de UI — não corresponde a nenhum endpoint
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  total_errors: number;
  duration_seconds: number;
}

export interface EnrichmentPreview {
  original_description?: string | null;
  enriched_description?: string | null;
  model_used: string;
}

export interface EnrichmentStats {
  total_listings: number;
  enriched_count: number;
  not_enriched_count: number;
  enrichment_percentage: number;
  by_source?: Record<string, { total: number; enriched: number }>;
}



// // Alinhado com os schemas do backend em app/schemas/ai_enrichment.py

export type AIEnrichmentTargetField = 'title' | 'description' | 'meta_description';

// // ---------------------------------------------------------------------------
// // Requests
// // ---------------------------------------------------------------------------

// /** POST /ai/listing */
export interface AIListingEnrichmentRequest {
  listing_id: string;
  fields: AIEnrichmentTargetField[];
  keywords?: string[];
  apply: boolean;
  force: boolean;
}

// // ---------------------------------------------------------------------------
// // Responses
// // ---------------------------------------------------------------------------

export interface AIEnrichmentFieldResult {
  field: AIEnrichmentTargetField;
  original: string | null;
  enriched: string | null;
  changed: boolean;
}

// /** Resposta de POST /ai/listing */
export interface AIListingEnrichmentResponse {
  listing_id: string;
  applied: boolean;
  model_used: string;
  keywords_used: string[];
  results: AIEnrichmentFieldResult[];
}
