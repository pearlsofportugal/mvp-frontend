import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, switchMap, catchError, of, startWith, map } from 'rxjs';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  ExportService,
} from '../../../../core/services/export.service';
import { RealEstateService } from '../../../../core/services/listings.service';
import { ExportFilters } from '../../../../core/models/export-filter.model';
import { safeValue } from '../../../../core/utils/resource.util';

/** Estado da contagem de anúncios que correspondem aos filtros. */
export type ExportPreview =
  | { status: 'loading' }
  | { status: 'ok'; total: number }
  | { status: 'error' };
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

  // ── Opções vindas do backend (em vez de texto livre) ──────────────────────
  private readonly vocabularies = rxResource({ stream: () => this.realEstateService.getVocabularies() });
  private readonly districtStats = rxResource({
    stream: () =>
      this.realEstateService.getListingStats().pipe(map((st) => Object.keys(st.by_district ?? {}))),
  });
  private readonly partnersResource = rxResource({ stream: () => this.realEstateService.getSourcePartners() });

  protected readonly propertyTypes = computed(() => safeValue(this.vocabularies)?.['property_type'] ?? []);
  protected readonly districts = computed(() =>
    (safeValue(this.districtStats) ?? []).slice().sort((x, y) => x.localeCompare(y, 'pt-PT')),
  );
  protected readonly partners = computed(() => safeValue(this.partnersResource) ?? []);

  readonly preview = toSignal(
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
            map((r): ExportPreview => ({ status: 'ok', total: r.meta?.total ?? 0 })),
            catchError(() => of<ExportPreview>({ status: 'error' })),
            startWith<ExportPreview>({ status: 'loading' }),
          ),
      ),
    ),
    { initialValue: { status: 'loading' } as ExportPreview },
  );

  readonly previewTotal = computed(() => {
    const p = this.preview();
    return p.status === 'ok' ? p.total : 0;
  });

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

    // Erros (401, 5xx…) já são mostrados pelo apiErrorInterceptor.
    this.exportService.download(format, filters).subscribe({ error: () => undefined });
  }
}
