import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';

import { RealEstateService } from '../../../../core/services/listings.service';
import type { ListingDetailRead, ListingUpdate } from '../../../../core/api/model';

@Component({
  selector: 'app-listing-edit',
  imports: [ReactiveFormsModule],
  templateUrl: './listing-edit.html',
  styleUrl: './listing-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingEditComponent implements OnInit {
  listing = input.required<ListingDetailRead>();
  saved = output<ListingDetailRead>();
  cancel = output<void>();

  protected readonly submitting = signal(false);

  protected readonly featureFields: { key: string; label: string }[] = [
    { key: 'has_garage', label: 'Garage' },
    { key: 'has_elevator', label: 'Elevator' },
    { key: 'has_balcony', label: 'Balcony' },
    { key: 'has_air_conditioning', label: 'Air Conditioning' },
    { key: 'has_pool', label: 'Pool' },
  ];

  private readonly service = inject(RealEstateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    title: new FormControl<string | null>(null),
    listing_type: new FormControl<'sale' | 'rent' | null>(null),
    property_type: new FormControl<string | null>(null),
    typology: new FormControl<string | null>(null),
    bedrooms: new FormControl<number | null>(null),
    bathrooms: new FormControl<number | null>(null),
    floor: new FormControl<string | null>(null),
    construction_year: new FormControl<number | null>(null),
    energy_certificate: new FormControl<string | null>(null),
    price_amount: new FormControl<number | null>(null),
    price_currency: new FormControl<string | null>(null),
    area_useful_m2: new FormControl<number | null>(null),
    area_gross_m2: new FormControl<number | null>(null),
    district: new FormControl<string | null>(null),
    county: new FormControl<string | null>(null),
    parish: new FormControl<string | null>(null),
    full_address: new FormControl<string | null>(null),
    has_garage: new FormControl<boolean | null>(null),
    has_elevator: new FormControl<boolean | null>(null),
    has_balcony: new FormControl<boolean | null>(null),
    has_air_conditioning: new FormControl<boolean | null>(null),
    has_pool: new FormControl<boolean | null>(null),
    advertiser: new FormControl<string | null>(null),
    contacts: new FormControl<string | null>(null),
    description: new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    const l = this.listing();
    this.form.patchValue({
      title: l.title ?? null,
      listing_type: (l.listing_type as 'sale' | 'rent' | null) ?? null,
      property_type: l.property_type ?? null,
      typology: l.typology ?? null,
      bedrooms: l.bedrooms ?? null,
      bathrooms: l.bathrooms ?? null,
      floor: l.floor ?? null,
      construction_year: l.construction_year ?? null,
      energy_certificate: l.energy_certificate ?? null,
      price_amount: l.price_amount != null ? Number(l.price_amount) : null,
      price_currency: l.price_currency ?? null,
      area_useful_m2: l.area_useful_m2 ?? null,
      area_gross_m2: l.area_gross_m2 ?? null,
      district: l.district ?? null,
      county: l.county ?? null,
      parish: l.parish ?? null,
      full_address: l.full_address ?? null,
      has_garage: l.has_garage ?? null,
      has_elevator: l.has_elevator ?? null,
      has_balcony: l.has_balcony ?? null,
      has_air_conditioning: l.has_air_conditioning ?? null,
      has_pool: l.has_pool ?? null,
      advertiser: l.advertiser ?? null,
      contacts: l.contacts ?? null,
      description: l.description ?? null,
    });
  }

  onSubmit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const payload: ListingUpdate = {};
    for (const [k, v] of Object.entries(raw)) {
      (payload as Record<string, unknown>)[k] = v;
    }

    this.service
      .updateListing(this.listing().id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: () => this.submitting.set(false),
      });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
