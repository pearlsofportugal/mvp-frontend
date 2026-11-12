import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { RealEstateFilters } from '../../../../core/models/listing.model';
import { RealEstateService } from '../../../../core/services/listings.service';
import type { SiteConfigRead } from '../../../../core/api/model';
import { safeValue } from '../../../../core/utils/resource.util';
import {
  SelectDropdownComponent,
  type SelectOption,
} from '../../../../shared/components/select-dropdown/select-dropdown';

type FilterKey =
  | 'source_partner'
  | 'property_type'
  | 'district'
  | 'county'
  | 'price_min'
  | 'price_max'
  | 'bedrooms'
  | 'is_enriched';

interface FilterChip {
  key: FilterKey;
  label: string;
  value: string;
}

const ALL: SelectOption = { value: '', label: 'Todos' };

@Component({
  selector: 'app-listings-filters',
  imports: [ReactiveFormsModule, SelectDropdownComponent],
  templateUrl: './listings-filters.html',
  styleUrl: './listings-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsFiltersComponent {
  private readonly listings = inject(RealEstateService);

  sites = input<SiteConfigRead[]>([]);
  filtersChange = output<RealEstateFilters>();

  protected readonly filterForm = new FormGroup({
    source_partner: new FormControl('', { nonNullable: true }),
    property_type: new FormControl('', { nonNullable: true }),
    district: new FormControl('', { nonNullable: true }),
    county: new FormControl('', { nonNullable: true }),
    price_min: new FormControl<number | null>(null),
    price_max: new FormControl<number | null>(null),
    bedrooms: new FormControl<number | null>(null),
    is_enriched: new FormControl('', { nonNullable: true }),
  });

  private readonly formValue = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.value,
  });

  /** Filtros efetivamente aplicados na última pesquisa (base dos chips). */
  private readonly applied = signal<RealEstateFilters>({});

  // ── Opções vindas do backend ──────────────────────────────────────────────

  private readonly vocabularies = rxResource({
    stream: () => this.listings.getVocabularies(),
  });

  private readonly districtStats = rxResource({
    stream: () =>
      this.listings.getListingStats().pipe(map((s) => Object.keys(s.by_district ?? {}))),
  });

  protected readonly sourceOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todos os sites' },
    ...this.sites().map((s) => ({ value: s.key, label: s.name || s.key })),
  ]);

  protected readonly propertyTypeOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todos os tipos' },
    ...(safeValue(this.vocabularies)?.['property_type'] ?? []).map((v) => ({ value: v, label: v })),
  ]);

  protected readonly districtOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todos os distritos' },
    ...(safeValue(this.districtStats) ?? [])
      .slice()
      .sort((a, b) => a.localeCompare(b, 'pt-PT'))
      .map((d) => ({ value: d, label: d })),
  ]);

  protected readonly enrichedOptions: SelectOption[] = [
    ALL,
    { value: 'true', label: 'Enriquecidos' },
    { value: 'false', label: 'Por enriquecer' },
  ];

  // ── Filtros ───────────────────────────────────────────────────────────────

  readonly filters = computed<RealEstateFilters>(() => {
    const value = this.formValue();
    const { is_enriched, ...rest } = value;
    const result = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== null && v !== ''),
    ) as RealEstateFilters;
    if (is_enriched !== '' && is_enriched != null) result.is_enriched = is_enriched === 'true';
    return result;
  });

  /** Resumo legível dos filtros aplicados — cada chip pode ser removido. */
  protected readonly chips = computed<FilterChip[]>(() => {
    const f = this.applied();
    const chips: FilterChip[] = [];
    const push = (key: FilterKey, label: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') {
        chips.push({ key, label, value: String(value) });
      }
    };

    const site = this.sites().find((s) => s.key === f.source_partner);
    push('source_partner', 'Site', f.source_partner ? (site?.name ?? f.source_partner) : null);
    push('property_type', 'Tipo', f.property_type);
    push('district', 'Distrito', f.district);
    push('county', 'Concelho', f.county);
    push('price_min', 'Preço mín.', f.price_min != null ? `${f.price_min} €` : null);
    push('price_max', 'Preço máx.', f.price_max != null ? `${f.price_max} €` : null);
    push('bedrooms', 'Quartos', f.bedrooms);
    if (f.is_enriched !== undefined) {
      push('is_enriched', 'IA', f.is_enriched ? 'enriquecidos' : 'por enriquecer');
    }
    return chips;
  });

  onSearch(): void {
    const filters = this.filters();
    this.applied.set(filters);
    this.filtersChange.emit(filters);
  }

  onClearFilters(): void {
    this.filterForm.reset();
    this.applied.set({});
    this.filtersChange.emit({});
  }

  protected removeChip(key: FilterKey): void {
    const controls = this.filterForm.controls;
    switch (key) {
      case 'price_min':
      case 'price_max':
      case 'bedrooms':
        controls[key].reset(null);
        break;
      default:
        controls[key].reset('');
    }
    this.onSearch();
  }
}
