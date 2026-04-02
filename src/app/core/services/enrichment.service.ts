import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { EnrichmentService as GeneratedEnrichmentService } from '../api/generated/enrichment/enrichment.service';
import { customFetch } from '../api/custom-fetch';
import type {
  AITextOptimizationRequest,
  AITextOptimizationResponse,
  AIListingEnrichmentRequest,
  AIListingEnrichmentResponse,
  ApiResponseAIListingEnrichmentResponse,
  BulkEnrichmentRequest,
  BulkEnrichmentResponse,
  EnrichmentStats,
} from '../api/model';

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService {
  private readonly api = inject(GeneratedEnrichmentService);
  private readonly http = inject(HttpClient);

  optimizeText(request: AITextOptimizationRequest): Observable<AITextOptimizationResponse> {
    return this.api
      .optimizeText(request)
      .pipe(map((r) => r.data!));
  }

  enrichListing(request: AIListingEnrichmentRequest): Observable<AIListingEnrichmentResponse> {
    return this.api
      .enhanceListing(request)
      .pipe(map((r) => r.data!));
  }

  getStats(sourcePartner?: string): Observable<EnrichmentStats> {
    return this.api
      .enrichmentStats(
        sourcePartner ? { source_partner: sourcePartner } : undefined,
      )
      .pipe(map((r) => r.data!));
  }

  bulkEnrichListings(request: BulkEnrichmentRequest): Observable<BulkEnrichmentResponse> {
    return this.api
      .bulkEnrichListings(request)
      .pipe(map((r) => r.data!));
  }

  /** Persist a previously previewed enrichment. `enrichedValues` must contain the
   * (optionally user-edited) AI-generated text keyed by field name.
   * Sends `apply: true` + `enriched_values` — the backend does NOT re-call AI. */
  applyListingEnrichment(
    listingId: string,
    enrichedValues: Record<string, string>,
  ): Observable<AIListingEnrichmentResponse> {
    return customFetch<ApiResponseAIListingEnrichmentResponse>(
      {
        url: '/api/v1/enrichment/ai/listing',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { listing_id: listingId, apply: true, enriched_values: enrichedValues },
      },
      this.http,
    ).pipe(map((r) => r.data!));
  }
}
