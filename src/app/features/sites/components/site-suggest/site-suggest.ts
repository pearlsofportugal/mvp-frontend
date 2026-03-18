import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import type { SiteConfigSuggestResponse, SelectorCandidate } from '../../../../core/api/model';
import { SELECTOR_FIELDS, SelectorField } from '../../selectors.schema';

export interface SelectorApplied {
  field: string;
  selector: string;
}

// Maps API suggest keys → SELECTOR_FIELDS keys
const SUGGEST_KEY_MAP: Record<string, string> = {
  price: 'price_selector',
  title: 'title_selector',
  area: 'useful_area_selector',
  land_area: 'gross_area_selector',
  rooms: 'bedrooms_selector',
  bathrooms: 'bathrooms_selector',
  property_type: 'property_type_selector',
  typology: 'typology_selector',
  condition: 'condition_selector',
  business_type: 'business_type_selector',
  district: 'district_selector',
  county: 'county_selector',
  parish: 'parish_selector',
  images: 'image_selector',
  listing_link: 'listing_link_selector',
  next_page: 'next_page_selector',
  description: 'description_selector',
  location: 'location_selector',
  publication_date: 'publication_date_selector',
  property_id: 'property_id_selector',
};

interface CandidateGroup {
  apiKey: string;
  field: SelectorField | null;
  label: string;
  candidates: SelectorCandidate[];
}

@Component({
  selector: 'app-site-suggest',
  templateUrl: './site-suggest.html',
  styleUrl: './site-suggest.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteSuggestComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  url = input.required<string>();
  selectorApplied = output<SelectorApplied>();

  protected readonly loading = signal(false);
  protected readonly result = signal<SiteConfigSuggestResponse | null>(null);

  protected readonly candidateGroups = computed<CandidateGroup[]>(() => {
    const r = this.result();
    if (!r) return [];

    return Object.entries(r.candidates)
      .filter(([, candidates]) => candidates.length > 0)
      .map(([apiKey, candidates]) => {
        const fieldKey = SUGGEST_KEY_MAP[apiKey];
        const field = fieldKey ? (SELECTOR_FIELDS.find((f) => f.key === fieldKey) ?? null) : null;
        return {
          apiKey,
          field,
          label: field?.label ?? apiKey.replace(/_/g, ' '),
          candidates,
        };
      });
  });

  protected readonly totalCandidates = computed(() =>
    this.candidateGroups().reduce((sum, g) => sum + g.candidates.length, 0),
  );

  protected readonly canSuggest = computed(() => this.url().length > 0);

  onSuggest(): void {
    if (!this.canSuggest()) return;
    this.loading.set(true);
    this.result.set(null);
    this.sitesService.suggest(this.url()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onApply(group: CandidateGroup, selector: string): void {
    const fieldKey = group.field?.key ?? SUGGEST_KEY_MAP[group.apiKey];
    if (fieldKey) {
      this.selectorApplied.emit({ field: fieldKey, selector });
    }
  }

  protected scorePercent(score: number): number {
    return Math.round(score * 100);
  }

  protected scoreClass(score: number): string {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.5) return 'score-mid';
    return 'score-low';
  }
}
