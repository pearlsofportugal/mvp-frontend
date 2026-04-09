import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import type { TestScrapeNormalized, TestScrapeResponse } from '../../../../core/api/model';

interface NormalizedField {
  label: string;
  value: string;
  critical: boolean;
}

const NORMALIZED_LABELS: Record<keyof TestScrapeNormalized, string> = {
  title: 'Title',
  listing_type: 'Listing Type',
  property_type: 'Property Type',
  typology: 'Typology',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  price_amount: 'Price',
  price_currency: 'Currency',
  price_per_m2: 'Price / m²',
  area_useful_m2: 'Useful Area (m²)',
  area_gross_m2: 'Gross Area (m²)',
  area_land_m2: 'Land Area (m²)',
  district: 'District',
  county: 'County',
  parish: 'Parish',
  energy_certificate: 'Energy Certificate',
  construction_year: 'Construction Year',
  has_garage: 'Garage',
  has_pool: 'Pool',
  has_elevator: 'Elevator',
  image_count: 'Images',
};

const CRITICAL_FIELDS = new Set(['title', 'price_amount', 'property_type', 'district']);

@Component({
  selector: 'app-site-test-scrape',
  imports: [FormsModule],
  templateUrl: './site-test-scrape.html',
  styleUrl: './site-test-scrape.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteTestScrapeComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  siteKey = input.required<string>();
  initialUrl = input<string>('');

  protected testUrl = signal('');
  protected testing = signal(false);
  protected result = signal<TestScrapeResponse | null>(null);
  protected showRaw = signal(false);

  protected readonly testStatus = computed<'idle' | 'success' | 'warning' | 'error'>(() => {
    const r = this.result();
    if (!r) return 'idle';
    if (!r.success) return 'error';
    if (r.missing_critical?.length) return 'warning';
    return 'success';
  });

  protected readonly normalizedFields = computed<NormalizedField[]>(() => {
    const n = this.result()?.normalized;
    if (!n) return [];
    return (Object.keys(NORMALIZED_LABELS) as (keyof TestScrapeNormalized)[])
      .filter((k) => n[k] != null)
      .map((k) => ({
        label: NORMALIZED_LABELS[k],
        value: this.formatValue(n[k]),
        critical: CRITICAL_FIELDS.has(k),
      }));
  });

  protected readonly rawEntries = computed<[string, string][]>(() => {
    const raw = this.result()?.raw;
    if (!raw) return [];
    return Object.entries(raw).map(([k, v]) => [k, String(v ?? '')]);
  });

  protected readonly canTest = computed(() => this.testUrl().trim().length > 0);

  constructor() {
    // Pre-fill URL from parent if provided
    const init = this.initialUrl();
    if (init) this.testUrl.set(init);
  }

  protected onRun(): void {
    const url = this.testUrl().trim();
    if (!url) return;
    this.testing.set(true);
    this.result.set(null);
    this.sitesService
      .testScrape(this.siteKey(), url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.testing.set(false);
        },
        error: () => {
          this.testing.set(false);
        },
      });
  }

  protected toggleRaw(): void {
    this.showRaw.update((v) => !v);
  }

  private formatValue(v: unknown): string {
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (v == null) return '—';
    return String(v);
  }
}
