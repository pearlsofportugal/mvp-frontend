import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, isDevMode, PLATFORM_ID, Service } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExportFilters } from '../models/export-filter.model';

export type ExportFormat = 'csv' | 'json' | 'excel';

const FILE_NAMES: Record<ExportFormat, string> = {
  csv: 'listings_export.csv',
  json: 'listings_export.json',
  excel: 'listings_export.xlsx',
};

@Service()
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/export`;

  /**
   * Descarrega o export via HttpClient (não `window.open`) para que o
   * `apiKeyInterceptor` envie o header `X-API-Key` exigido pelo backend.
   */
  download(format: ExportFormat, filters: ExportFilters): Observable<Blob> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }

    return this.http
      .get(`${this.baseUrl}/${format}`, { params, responseType: 'blob' })
      .pipe(tap((blob) => this.saveBlob(blob, FILE_NAMES[format])));
  }

  private saveBlob(blob: Blob, fileName: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Libertar depois do click ter sido processado.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    if (isDevMode()) console.debug(`[ExportService] ${fileName} (${blob.size} bytes)`);
  }
}
