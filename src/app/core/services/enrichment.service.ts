import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EnrichmentService as GeneratedEnrichmentService } from '../api/generated/enrichment/enrichment.service';
import type {
  BulkEnrichmentRequest,
  BulkEnrichmentResponse,
  EnrichmentStats,
  ListingTranslationRequest,
  ListingTranslationResponse,
} from '../api/model';

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService {
  private readonly api = inject(GeneratedEnrichmentService);

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

  /** Generate (apply=false) or persist (apply=true) multi-locale SEO content.
   * Step 1: call with apply=false to preview. Step 2: call with apply=true + translation_values to persist. */
  translateListing(request: ListingTranslationRequest): Observable<ListingTranslationResponse> {
    return this.api.translateListing(request).pipe(map((r) => r.data!));
  }
}
