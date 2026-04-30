import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map } from 'rxjs';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { EnrichmentService as GeneratedEnrichmentService } from '../api/generated/enrichment/enrichment.service';
import type {
  BulkEnrichmentRequest,
  BulkJobAccepted,
  BulkJobStatus,
  EnrichmentStats,
  ListingTranslationRequest,
  ListingTranslationResponse,
} from '../api/model';
import { environment } from '../../../environments/environment';
import { createSseObservable } from './sse.utl';

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService {
  private readonly api = inject(GeneratedEnrichmentService);
  private readonly basePath = '/api/v1/enrichment/ai';

  getStats(sourcePartner?: string): Observable<EnrichmentStats> {
    return this.api
      .enrichmentStats(sourcePartner ? { source_partner: sourcePartner } : undefined)
      .pipe(map((r) => r.data!));
  }

  /** Submit bulk enrichment job — returns immediately with job_id (HTTP 202). */
  bulkEnrichListings(request: BulkEnrichmentRequest): Observable<BulkJobAccepted> {
    return this.api.bulkEnrichListings(request).pipe(map((r) => r.data!));
  }

  /** Poll current status of a bulk enrichment job. */
  getBulkEnrichJob(jobId: string): Observable<BulkJobStatus> {
    return this.api.getBulkEnrichJob(jobId).pipe(map((r) => r.data!));
  }

  streamBulkEnrichJob(jobId: string): Observable<BulkJobStatus> {
    const url = `${environment.apiUrl}${this.basePath}/bulk/jobs/${jobId}/stream`;

    return createSseObservable<BulkJobStatus>(url, {
      apiKey: environment.apiKey ?? '',

      isTerminal: (data) =>
        data.status === 'completed' || data.status === 'failed' ,

      maxRetries: 5,
      baseRetryDelayMs: 500,
      maxRetryDelayMs: 10_000,
      idleTimeoutMs: 60_000,
      dedup: true,
    });
  }
  /** Generate (apply=false) or persist (apply=true) multi-locale SEO content. */
  translateListing(request: ListingTranslationRequest): Observable<ListingTranslationResponse> {
    return this.api.translateListing(request).pipe(map((r) => r.data!));
  }
}
