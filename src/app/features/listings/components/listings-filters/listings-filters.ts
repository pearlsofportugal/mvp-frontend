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
    district: new FormControl('', { nonNullable: true }),
    county: new FormControl('', { nonNullable: true }),
    price_min: new FormControl<number | null>(null),
    price_max: new FormControl<number | null>(null),
    bedrooms: new FormControl<number | null>(null),
    area_min: new FormControl<number | null>(null),
    area_max: new FormControl<number | null>(null),
  });

  private formValue = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.value,
  });

  protected readonly sourceOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All sources' },
    ...this.sites().map(s => ({ value: s.key, label: s.name || s.key })),
  ]);

  readonly filters = computed<RealEstateFilters>(() => {
    const value = this.formValue();
    return Object.fromEntries(
      Object.entries(value).filter(([_, v]) => v !== null && v !== '')
    ) as RealEstateFilters;
  });

  onSearch(): void {
    this.filtersChange.emit(this.filters());
  }

  onClearFilters(): void {
    this.filterForm.reset();
    this.filtersChange.emit({});
  }
}
