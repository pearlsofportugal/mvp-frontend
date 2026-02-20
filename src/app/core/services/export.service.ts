import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface ExportFilters {
  district?: string;
  county?: string;
  property_type?: string;
  source_partner?: string;
  price_min?: number;
  price_max?: number;
  scrape_job_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/export`;
  private readonly platformId = inject(PLATFORM_ID);
  download(format: 'csv' | 'json' | 'excel', filters: ExportFilters): void {
    const params = new URLSearchParams();

    if (filters.district) params.set('district', filters.district);
    if (filters.county) params.set('county', filters.county);
    if (filters.property_type)
      params.set('property_type', filters.property_type);
    if (filters.source_partner)
      params.set('source_partner', filters.source_partner);
    if (filters.price_min !== undefined)
      params.set('price_min', filters.price_min.toString());
    if (filters.price_max !== undefined)
      params.set('price_max', filters.price_max.toString());
    if (filters.scrape_job_id)
      params.set('scrape_job_id', filters.scrape_job_id);

    const url = `${this.baseUrl}/${format}?${params.toString()}`;
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank');
    }
  }
}
