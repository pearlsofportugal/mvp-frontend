import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { RealEstateFilters } from '../models/listing.model';
import { ListingsService as GeneratedListingsService } from '../api/generated/listings/listings.service';
import type {
  ListingDetailRead,
  ListingListRead,
  ListingStats,
  ListingSearchItem,
  ListingUpdate,
  Meta,
  ListListingsParams,
} from '../api/model';

export interface PaginatedListings {
  items: ListingListRead[];
  meta: Meta;
}

@Injectable({
  providedIn: 'root',
})
export class RealEstateService {
  private readonly api = inject(GeneratedListingsService);

  getListings(filters: RealEstateFilters): Observable<PaginatedListings> {
    // Sem `include=detail` o backend devolve sempre `PaginatedResponse` (itens de lista).
    return this.api.listListings(this.normalizeFilters(filters)).pipe(
      map((r) => ({ items: (r.data?.items ?? []) as ListingListRead[], meta: r.meta! })),
    );
  }

  getListingById(id: string): Observable<ListingDetailRead> {
    return this.api
      .getListing(id)
      .pipe(map((r) => r.data!));
  }
getSourcePartners(): Observable<string[]> {
  return this.api
    .listSourcePartners()
    .pipe(map((r) => r.data ?? []));
}
  getListingStats(sourcePartner?: string): Observable<ListingStats> {
    return this.api
      .listingStats(
        sourcePartner ? { source_partner: sourcePartner } : undefined,
      )
      .pipe(map((r) => r.data!));
  }

  deleteListing(id: string): Observable<void> {
    return this.api
      .deleteListing(id)
      .pipe(map(() => void 0));
  }

  updateListing(id: string, payload: ListingUpdate): Observable<ListingDetailRead> {
    return this.api
      .updateListing(id, payload)
      .pipe(map((r) => r.data!));
  }

  searchListings(query: string, limit = 20): Observable<ListingListRead[]> {
    return this.api
      .listListings({ search: query, page_size: limit })
      .pipe(map((r) => (r.data?.items ?? []) as ListingListRead[]));
  }

  searchForSelector(
    query: string,
    options: {
      source_partner?: string;
      is_enriched?: boolean;
      is_exported_to_imodigi?: boolean;
      page?: number;
      page_size?: number;
    } = {},
  ): Observable<{ items: ListingSearchItem[] } & Meta> {
    return this.api
      .selectorListings({
        q: query,
        page: options.page ?? 1,
        page_size: options.page_size ?? 20,
        source_partner: options.source_partner,
        is_enriched: options.is_enriched,
        is_exported_to_imodigi: options.is_exported_to_imodigi,
      })
      .pipe(
        map((r) => ({
          items: r.data?.items ?? [],
          page: r.meta?.page,
          page_size: r.meta?.page_size,
          total: r.meta?.total,
          pages: r.meta?.pages,
        })),
      );
  }

  private normalizeFilters(filters: RealEstateFilters): ListListingsParams {
    // `bedrooms` só existe no frontend: não pode seguir como query param.
    const { bedrooms, ...normalized } = filters;

    if (
      bedrooms !== undefined &&
      bedrooms !== null &&
      normalized.bedrooms_min === undefined &&
      normalized.bedrooms_max === undefined
    ) {
      normalized.bedrooms_min = bedrooms;
      normalized.bedrooms_max = bedrooms;
    }
    return normalized;
  }
}
