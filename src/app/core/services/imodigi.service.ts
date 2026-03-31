import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ImodigiService as GeneratedImodigiService } from '../api/generated/imodigi/imodigi.service';
import type {
  ImodigiStoreRead,
  ImodigiCatalogValues,
  ImodigiLocationItem,
  ImodigiExportResponse,
  ImodigiExportRead,
  ImodigiSearchLocationsParams,
  ImodigiListExportsParams,
} from '../api/model';

@Injectable({ providedIn: 'root' })
export class ImodigiService {
  private readonly api = inject(GeneratedImodigiService);

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
      .imodigiExportListing(listingId, { client_id: clientId ?? null })
      .pipe(map((r) => r.data!));
  }

  listExports(params?: ImodigiListExportsParams): Observable<ImodigiExportRead[]> {
    return this.api.imodigiListExports(params).pipe(map((r) => r.data ?? []));
  }

  getExport(listingId: string): Observable<ImodigiExportRead> {
    return this.api.imodigiGetExport(listingId).pipe(map((r) => r.data!));
  }
}
