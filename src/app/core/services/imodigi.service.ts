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
import { createSseObservable } from './sse.utl';

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
  streamBulkPublishJob(jobId: string): Observable<BulkJobStatus> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable((observer) => observer.complete());
    }

    const url = `${environment.apiUrl}${this.basePath}/publish/jobs/${jobId}/stream`;

    return createSseObservable<BulkJobStatus>(url, {
      apiKey: environment.apiKey ?? '',

      isTerminal: (data) => {
        return (
          data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled'
        );
      },
      maxRetries: 5,
      baseRetryDelayMs: 500,
      maxRetryDelayMs: 10_000,
      idleTimeoutMs: 60_000,
      dedup: true,
    });
  }
}
