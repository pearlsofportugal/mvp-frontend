import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Observable, Subject, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ImodigiService as GeneratedImodigiService } from '../api/generated/imodigi/imodigi.service';
import type {
  ImodigiStoreRead,
  ImodigiCatalogValues,
  ImodigiLocationItem,
  ImodigiExportResponse,
  ImodigiExportRead,
  ImodigiSearchLocationsParams,
  ImodigiListPublicationsParams,
  ImodigiBulkExportRequest,
  BulkJobAccepted,
  BulkJobStatus,
} from '../api/model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImodigiService {
  private readonly api = inject(GeneratedImodigiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly basePath = '/api/v1/imodigi';

  listStores(): Observable<ImodigiStoreRead[]> {
    return this.api.imodigiListStores().pipe(map((r) => r.data ?? []));
  }

  catalogValues(): Observable<ImodigiCatalogValues> {
    return this.api.imodigiCatalogValues().pipe(map((r) => r.data!));
  }

  searchLocations(params: ImodigiSearchLocationsParams): Observable<ImodigiLocationItem[]> {
    return this.api.imodigiSearchLocations(params).pipe(map((r) => r.data ?? []));
  }

  exportListing(listingId: string, clientId?: number | null): Observable<ImodigiExportResponse> {
    return this.api
      .imodigiPublishListing(listingId, { client_id: clientId ?? null })
      .pipe(map((r) => r.data!));
  }

  listExports(params?: ImodigiListPublicationsParams): Observable<ImodigiExportRead[]> {
    return this.api.imodigiListPublications(params).pipe(map((r) => r.data ?? []));
  }

  getExport(listingId: string): Observable<ImodigiExportRead> {
    return this.api.imodigiGetPublication(listingId).pipe(map((r) => r.data!));
  }

  /** Submit bulk publish job — returns immediately with job_id (HTTP 202). */
  bulkPublish(request: ImodigiBulkExportRequest): Observable<BulkJobAccepted> {
    return this.api.imodigiBulkPublish(request).pipe(map((r) => r.data!));
  }

  /** Poll current status of a bulk publish job. */
  getBulkPublishJob(jobId: string): Observable<BulkJobStatus> {
    return this.api.imodigiGetBulkJob(jobId).pipe(map((r) => r.data!));
  }

  /**
   * Stream progress of a bulk Imodigi publish job via SSE.
   * Emits `BulkJobStatus` updates; completes when status = completed/failed.
   */
  streamBulkPublishJob(jobId: string): Observable<BulkJobStatus> {
    const subject = new Subject<BulkJobStatus>();
    const abortController = new AbortController();
    const url = `${environment.apiUrl}${this.basePath}/publish/jobs/${jobId}/stream`;

    if (!isPlatformBrowser(this.platformId)) {
      return new Observable((observer) => observer.complete());
    }

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
}
