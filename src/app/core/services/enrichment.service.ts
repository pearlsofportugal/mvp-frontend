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

@Injectable({
  providedIn: 'root',
})
export class EnrichmentService {
  private readonly api = inject(GeneratedEnrichmentService);
  private readonly basePath = '/api/v1/enrichment/ai';

  getStats(sourcePartner?: string): Observable<EnrichmentStats> {
    return this.api
      .enrichmentStats(
        sourcePartner ? { source_partner: sourcePartner } : undefined,
      )
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

  /**
   * Stream progress of a bulk enrichment job via SSE.
   * Emits `BulkJobStatus` updates; completes when status = completed/failed.
   */
  streamBulkEnrichJob(jobId: string): Observable<BulkJobStatus> {
    const subject = new Subject<BulkJobStatus>();
    const abortController = new AbortController();
    const url = `${environment.apiUrl}${this.basePath}/bulk/jobs/${jobId}/stream`;

    fetchEventSource(url, {
      method: 'GET',
      headers: {
        'X-API-Key': environment.apiKey ?? '',
        Accept: 'text/event-stream',
      },
      signal: abortController.signal,

      onopen: async (response) => {
        if (!response.ok) {
          subject.error(new Error(`SSE falhou com status ${response.status}`));
          abortController.abort();
        }
      },

      onmessage: (event) => {
        if (!event.data) return;
        try {
          const data = JSON.parse(event.data) as BulkJobStatus;

          if (event.event === 'done') {
            subject.next(data);
            subject.complete();
            abortController.abort();
            return;
          }

          if (event.event === 'error') {
            subject.error(new Error((data as unknown as { message?: string }).message ?? 'Erro no stream SSE'));
            abortController.abort();
            return;
          }

          if (event.event === 'heartbeat') return;

          subject.next(data);
        } catch (e) {
          console.warn('[SSE] Erro a parsear evento:', event.data, e);
        }
      },

      onerror: (err) => {
        subject.error(err);
        throw err;
      },

      onclose: () => {
        if (!subject.closed) subject.complete();
      },
    });

    return new Observable<BulkJobStatus>((observer) => {
      const subscription = subject.subscribe(observer);
      return () => {
        subscription.unsubscribe();
        abortController.abort();
      };
    });
  }

  /** Generate (apply=false) or persist (apply=true) multi-locale SEO content. */
  translateListing(request: ListingTranslationRequest): Observable<ListingTranslationResponse> {
    return this.api.translateListing(request).pipe(map((r) => r.data!));
  }
}
