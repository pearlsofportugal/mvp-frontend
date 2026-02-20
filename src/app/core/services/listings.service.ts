import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RealEstate,
  RealEstateListItem,
  RealEstateFilters,
  PaginatedResponse,
  RealEstateStats,
} from '../models/listing.model';
import { BaseApiService } from './base-api.service';
import { PaginatedData } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class RealEstateService extends BaseApiService {
  private readonly path = '/api/v1/listings';

  getListings(filters: RealEstateFilters): Observable<PaginatedData<RealEstateListItem>> {
    // getPaginated já faz o map — sem pipe extra necessário
    return this.getPaginated<RealEstateListItem>(this.path, this.normalizeFilters(filters));
  }
  private normalizeFilters(filters: RealEstateFilters): Record<string, any> {
    const normalized = { ...filters };

    // Converte `bedrooms` exato para min/max se não vierem definidos
    if (
      normalized.bedrooms !== undefined &&
      normalized.bedrooms !== null &&
      normalized.bedrooms_min === undefined &&
      normalized.bedrooms_max === undefined
    ) {
      normalized.bedrooms_min = normalized.bedrooms;
      normalized.bedrooms_max = normalized.bedrooms;
    }
    delete normalized.bedrooms;

    return normalized;
  }
  getListingById(id: string): Observable<RealEstate> {
    return this.get<RealEstate>(this.buildRoute(`${this.path}/:id`, { id }));
  }
  getListingStats(sourcePartner?: string): Observable<RealEstateStats> {
    return this.get<RealEstateStats>(`${this.path}/stats`, sourcePartner ? { source_partner: sourcePartner } : undefined);
  }

  deleteListing(id: string): Observable<void> {
    return this.delete(this.buildRoute(`${this.path}/:id`, { id }));
  }
}
