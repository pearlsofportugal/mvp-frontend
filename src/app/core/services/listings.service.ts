import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  RealEstate,
  RealEstateListItem,
  RealEstateFilters,
  RealEstateStats,
  ListingSearchResponse,
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
  searchListings(query: string, limit = 20): Observable<RealEstateListItem[]> {
    return this.getPaginated<RealEstateListItem>(this.path, { search: query, page_size: limit })
      .pipe(map(data => data.items));
  }


  searchForSelector(
    query: string,
    options: {
      source_partner?: string;
      is_enriched?: boolean;
      page?: number;
      page_size?: number;
    } = {}
  ): Observable<ListingSearchResponse> {
    const params: Record<string, any> = {
      q: query,
      page: options.page ?? 1,
      page_size: options.page_size ?? 20,
    };

    if (options.source_partner) params['source_partner'] = options.source_partner;
    if (options.is_enriched !== undefined) params['is_enriched'] = options.is_enriched;

    return this.get<ListingSearchResponse>(`${this.path}/search`, params);
  }





}
