import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SitesService as GeneratedSitesService } from '../api/generated/sites/sites.service';
import type {
  SiteConfigRead,
  SiteConfigCreate,
  SiteConfigUpdate,
  SiteConfigSuggestResponse,
  SiteConfigPreviewResponse,
  SelectorValidationReport,
  TestScrapeResponse,
  TestListingPageResponse,
} from '../api/model';

@Injectable({
  providedIn: 'root',
})
export class SitesService {
  private readonly api = inject(GeneratedSitesService);

  list(): Observable<SiteConfigRead[]> {
    return this.api
      .listSites()
      .pipe(map((r) => r.data ?? []));
  }

  getByKey(key: string): Observable<SiteConfigRead> {
    return this.api
      .getSite(key)
      .pipe(map((r) => r.data!));
  }

  create(payload: SiteConfigCreate): Observable<SiteConfigRead> {
    return this.api
      .createSite(payload)
      .pipe(map((r) => r.data!));
  }

  update(key: string, payload: SiteConfigUpdate): Observable<SiteConfigRead> {
    return this.api
      .updateSite(key, payload)
      .pipe(map((r) => r.data!));
  }

  remove(key: string, permanent = false): Observable<void> {
    return this.api
      .deleteSite(key, { permanent })
      .pipe(map(() => void 0));
  }

  suggest(url: string): Observable<SiteConfigSuggestResponse> {
    return this.api
      .suggestSiteSelectors({ url })
      .pipe(map((r) => r.data!));
  }

  previewSelector(url: string, selector: string): Observable<SiteConfigPreviewResponse> {
    return this.api
      .previewSiteSelector({ url, selector })
      .pipe(map((r) => r.data!));
  }

  validateSelectors(
    key: string,
    selectors: Record<string, string>,
    url?: string,
  ): Observable<SelectorValidationReport> {
    return this.api
      .validateSiteSelectors(key, { selectors, url: url ?? null })
      .pipe(map((r) => r.data!));
  }

  testScrape(key: string, url: string): Observable<TestScrapeResponse> {
    return this.api
      .testScrapeSite(key, { url })
      .pipe(map((r) => r.data!));
  }

  testListingPage(
    key: string,
    url: string,
    linkPattern?: string | null,
    thumbnailSelector?: string | null,
  ): Observable<TestListingPageResponse> {
    return this.api
      .testListingPageSite(key, {
        url,
        link_pattern: linkPattern ?? null,
        thumbnail_selector: thumbnailSelector ?? null,
      })
      .pipe(map((r) => r.data!));
  }
}
