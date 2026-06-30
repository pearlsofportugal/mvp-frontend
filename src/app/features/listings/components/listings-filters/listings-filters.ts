import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
 
import { RealEstateFilters } from '../../../../core/models/listing.model';
import type { SiteConfigRead } from '../../../../core/api/model';
import { SelectDropdownComponent, type SelectOption } from '../../../../shared/components/select-dropdown/select-dropdown';
@Component({
  selector: 'app-listings-filters',
  imports: [ReactiveFormsModule, SelectDropdownComponent],
  templateUrl: './listings-filters.html',
  styleUrl: './listings-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsFiltersComponent {
  sites = input<SiteConfigRead[]>([]);
  filtersChange = output<RealEstateFilters>();
 
  protected readonly filterForm = new FormGroup({
    source_partner: new FormControl('', { nonNullable: true }),
    property_type: new FormControl('', { nonNullable: true }),
    typology: new FormControl('', { nonNullable: true }),
    business_type: new FormControl('', { nonNullable: true }),
    district: new FormControl('', { nonNullable: true }),
    county: new FormControl('', { nonNullable: true }),
    price_min: new FormControl<number | null>(null),
    price_max: new FormControl<number | null>(null),
    area_min: new FormControl<number | null>(null),
    area_max: new FormControl<number | null>(null),
    bedrooms_min: new FormControl<number | null>(null),
    bedrooms_max: new FormControl<number | null>(null),
    bathrooms_min: new FormControl<number | null>(null),
    bathrooms_max: new FormControl<number | null>(null),
    energy_certificate: new FormControl('', { nonNullable: true }),
    has_garage: new FormControl(false, { nonNullable: true }),
    has_pool: new FormControl(false, { nonNullable: true }),
    has_elevator: new FormControl(false, { nonNullable: true }),
    has_balcony: new FormControl(false, { nonNullable: true }),
    is_enriched: new FormControl('', { nonNullable: true }),
    is_exported_to_imodigi: new FormControl('', { nonNullable: true }),
  });
 
  private formValue = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.value,
  });
 
  protected readonly sourceOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All sources' },
    ...this.sites().map(s => ({ value: s.key, label: s.name || s.key })),
  ]);
 
  protected readonly listingTypeOptions: SelectOption[] = [
    { value: '', label: 'Sale or rent' },
    { value: 'sale', label: 'Sale' },
    { value: 'rent', label: 'Rent' },
  ];
 
  protected readonly energyCertificateOptions: SelectOption[] = [
    { value: '', label: 'Any energy class' },
    { value: 'A+', label: 'A+' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'B-', label: 'B-' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'Isento', label: 'Isento' },
  ];
 
  protected readonly enrichedOptions: SelectOption[] = [
    { value: 'true', label: 'Enriched' },
    { value: 'false', label: 'Not enriched' },
  ];
 
  protected readonly imodigiOptions: SelectOption[] = [
    { value: 'true', label: 'Exported' },
    { value: 'false', label: 'Not exported' },
  ];
 
  // Boolean checkbox fields — only included in the outgoing filter when checked (true).
  // Unchecked stays absent rather than explicit `false`, since `has_garage=false`
  // would filter out listings with garages instead of just not filtering on it.
  private static readonly BOOLEAN_FIELDS = [
    'has_garage',
    'has_pool',
    'has_elevator',
    'has_balcony',
  ] as const;
 
  readonly filters = computed<RealEstateFilters>(() => {
    const value = this.formValue();
    const {
      is_enriched,
      is_exported_to_imodigi,
      has_garage,
      has_pool,
      has_elevator,
      has_balcony,
      ...rest
    } = value;
 
    const result = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== null && v !== '')
    ) as RealEstateFilters;
 
    if (is_enriched !== '' && is_enriched != null) {
      result.is_enriched = is_enriched === 'true';
    }
    if (is_exported_to_imodigi !== '' && is_exported_to_imodigi != null) {
      result.is_exported_to_imodigi = is_exported_to_imodigi === 'true';
    }
 
    const booleanValues: Record<string, boolean | undefined> = {
      has_garage,
      has_pool,
      has_elevator,
      has_balcony,
    };
    for (const field of ListingsFiltersComponent.BOOLEAN_FIELDS) {
      if (booleanValues[field]) {
        result[field] = true;
      }
    }
 
    return result;
  });
 
  onSearch(): void {
    this.filtersChange.emit(this.filters());
  }
 
  onClearFilters(): void {
    this.filterForm.reset();
    this.filtersChange.emit({});
  }
}
