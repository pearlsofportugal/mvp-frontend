import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, catchError, of, startWith } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ExportService,
  ExportFilters,
} from '../../../../core/services/export.service';
import { RealEstateService } from '../../../../core/services/listings.service';
type ExportFormGroup = FormGroup<{
  district: FormControl<string>;
  county: FormControl<string>;
  property_type: FormControl<string>;
  source_partner: FormControl<string>;
  price_min: FormControl<string>;
  price_max: FormControl<string>;
}>;
@Component({
  selector: 'app-export-form',
  imports: [ReactiveFormsModule],
  templateUrl: './export-form.html',
  styleUrl: './export-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFormComponent {
  private readonly exportService = inject(ExportService);
  private readonly realEstateService = inject(RealEstateService);

  protected readonly form: ExportFormGroup = new FormGroup({
  district: new FormControl('', { nonNullable: true }),
  county: new FormControl('', { nonNullable: true }),
  property_type: new FormControl('', { nonNullable: true }),
  source_partner: new FormControl('', { nonNullable: true }),
  price_min: new FormControl('', { nonNullable: true }),
  price_max: new FormControl('', { nonNullable: true }),
});

  readonly previewCount = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.value),
      debounceTime(400),
      switchMap((v) =>
        this.realEstateService
          .getListings({
            district: v.district || undefined,
            county: v.county || undefined,
            property_type: v.property_type || undefined,
            source_partner: v.source_partner || undefined,
            price_min: v.price_min ? Number(v.price_min) : undefined,
            price_max: v.price_max ? Number(v.price_max) : undefined,
            page: 1,
            page_size: 1,
          })
          .pipe(
            catchError(() => of(null)),
          ),
      ),
    ),
    { initialValue: null },
  );

  exportData(format: 'csv' | 'json' | 'excel'): void {
    const filters: ExportFilters = {
      district: this.form.value.district || undefined,
      county: this.form.value.county || undefined,
      property_type: this.form.value.property_type || undefined,
      source_partner: this.form.value.source_partner || undefined,
      price_min:
        this.form.value.price_min !== ''
          ? Number(this.form.value.price_min)
          : undefined,
      price_max:
        this.form.value.price_max !== ''
          ? Number(this.form.value.price_max)
          : undefined,
    };

    this.exportService.download(format, filters);
  }
}
