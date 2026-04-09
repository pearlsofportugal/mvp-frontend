// ---------------------------------------------------------------------------
// Modelos locais de UI — não correspondem a endpoints gerados
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  total_errors: number;
  duration_seconds: number;
}

export interface EnrichmentStats {
  total_listings: number;
  enriched_count: number;
  not_enriched_count: number;
  enrichment_percentage: number;
  by_source?: Record<string, { total: number; enriched_count: number }>;
}
