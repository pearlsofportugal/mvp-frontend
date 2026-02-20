import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AITextOptimizationRequest,
  AITextOptimizationResponse,
  EnrichmentPreview,
  EnrichmentStats,
  AIListingEnrichmentResponse,
  AIListingEnrichmentRequest,
} from '../models/enrichment.model';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService extends BaseApiService {
  private readonly path = '/api/v1/enrichment/ai';

  optimizeText(request: AITextOptimizationRequest): Observable<AITextOptimizationResponse> {
    return this.post<AITextOptimizationResponse>(`${this.path}/optimize`, request);
  }

  enrichListing(
    request: AIListingEnrichmentRequest
  ): Observable<AIListingEnrichmentResponse> {
    return this.post<AIListingEnrichmentResponse>(`${this.path}/listing`, request);
  }


  previewEnrichment(listingId: string): Observable<EnrichmentPreview> {
    return this.post<EnrichmentPreview>(
      this.buildRoute(`${this.path}/preview/:listingId`, { listingId }),
      {}
    );
  }

  /**
   * Obtém estatísticas agregadas de enrichment.
   * Equivale a GET /ai/stats no backend.
   */
  getStats(sourcePartner?: string): Observable<EnrichmentStats> {
    return this.get<EnrichmentStats>(
      `${this.path}/stats`,
      sourcePartner ? { source_partner: sourcePartner } : undefined
    );
  }
}
