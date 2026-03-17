import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EnrichmentService as GeneratedEnrichmentService } from '../api/generated/enrichment/enrichment.service';
import type {
  AITextOptimizationRequest,
  AITextOptimizationResponse,
  AIListingEnrichmentRequest,
  AIListingEnrichmentResponse,
  EnrichmentPreview,
  EnrichmentStats,
} from '../api/model';

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService {
  private readonly api = inject(GeneratedEnrichmentService);

  optimizeText(request: AITextOptimizationRequest): Observable<AITextOptimizationResponse> {
    return this.api
      .optimizeText(request)
      .pipe(map((r) => r.data!));
  }

  enrichListing(request: AIListingEnrichmentRequest): Observable<AIListingEnrichmentResponse> {
    return this.api
      .enrichListing(request)
      .pipe(map((r) => r.data!));
  }

  previewEnrichment(listingId: string): Observable<EnrichmentPreview> {
    return this.api
      .previewEnrichment(listingId)
      .pipe(map((r) => r.data!));
  }

  getStats(sourcePartner?: string): Observable<EnrichmentStats> {
    return this.api
      .enrichmentStats(
        sourcePartner ? { source_partner: sourcePartner } : undefined,
      )
      .pipe(map((r) => r.data!));
  }
}
