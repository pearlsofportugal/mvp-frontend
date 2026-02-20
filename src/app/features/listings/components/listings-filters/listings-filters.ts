import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { RealEstateFilters } from '../../../../core/models/listing.model';

@Component({
  selector: 'app-listings-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './listings-filters.html',
  styleUrl: './listings-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsFiltersComponent {
  private readonly fb = inject(FormBuilder);

  filtersChange = output<RealEstateFilters>();
  viewStats = output<void>();

  filterForm = this.fb.group({
    source_partner: [''],
    property_type: [''],
    district: [''],
    county: [''],
    price_min: [null as number | null],
    price_max: [null as number | null],
    bedrooms: [null as number | null],
    area_min: [null as number | null],
    area_max: [null as number | null],
  });

  private formValue = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.value,
  });

  readonly filters = computed<RealEstateFilters>(() => {
    const value = this.formValue();
    return Object.fromEntries(
      Object.entries(value).filter(([_, v]) => v !== null && v !== '')
    ) as RealEstateFilters;
  });

  onSearch(): void {
    this.filtersChange.emit(this.filters());
  }

  onViewStats(): void {
    this.viewStats.emit();
  }
}
