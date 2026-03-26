import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import { EnrichmentResult } from '../../../../core/models/enrichment.model';
import type {
  AIListingEnrichmentResponse,
  AIListingEnrichmentRequest,
  AIListingEnrichmentRequestFieldsItem,
  BulkEnrichmentRequestFieldsItem,
  ListingDetailRead,
  ListingSearchItem,
} from '../../../../core/api/model';
import { RealEstateService } from '../../../../core/services/listings.service';
import { of, finalize, timer, Subject, takeUntil } from 'rxjs';
import { ListingSelectorComponent } from '../../../listings/components/listing-selector/listing-selector';
import { DecimalPipe } from '@angular/common';


type EnrichmentFormGroup = FormGroup<{
  target_title: FormControl<boolean>;
  target_description: FormControl<boolean>;
  target_meta_description: FormControl<boolean>;
  force_regeneration: FormControl<boolean>;
}>;

@Component({
  selector: 'app-enrichment-form',
  imports: [ReactiveFormsModule, ListingSelectorComponent, DecimalPipe],
  templateUrl: './enrichment-form.html',
  styleUrl: './enrichment-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentFormComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly realEstateService = inject(RealEstateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly progressStop$ = new Subject<void>();

  private readonly aiProgressMessages = [
    'A analisar contexto do imóvel...',
    'A identificar pontos de SEO e clareza...',
    'A gerar nova versão com IA...',
    'A otimizar tom e legibilidade...',
    'A validar qualidade final do texto...',
  ] as const;

  readonly success = output<EnrichmentResult>();
  readonly listingSelected = output<string>();
  readonly generated = output<AIListingEnrichmentResponse | null>();

  protected readonly form: EnrichmentFormGroup = new FormGroup({
    target_title: new FormControl(false, { nonNullable: true }),
    target_description: new FormControl(true, { nonNullable: true }),
    target_meta_description: new FormControl(false, { nonNullable: true }),
    force_regeneration: new FormControl(false, { nonNullable: true }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedListings = signal<ListingSearchItem[]>([]);
  protected readonly selectedListingId = computed(() => this.selectedListings()[0]?.id ?? null);
  protected readonly batchProgress = signal<{ done: number; total: number } | null>(null);
  protected readonly directResult = signal<AIListingEnrichmentResponse | null>(null);
  protected readonly generationProgress = signal(0);
  protected readonly generationStepIndex = signal(0);

  protected onListingsConfirmed(listings: ListingSearchItem[]): void {
    this.selectedListings.set(listings);
    this.directResult.set(null);
    this.generated.emit(null);
    this.error.set(null);
    this.batchProgress.set(null);
    if (listings.length > 0) {
      this.listingSelected.emit(listings[0].id);
    }
  }

  readonly listingResource = rxResource<ListingDetailRead | null, string | null>({
    params: () => this.selectedListingId(),
    stream: ({ params }) => (params ? this.realEstateService.getListingById(params) : of(null)),
  });

  protected readonly selectedListing = computed<ListingDetailRead | null>(() => this.listingResource.value() ?? null);
  protected readonly loadingListing = computed(() => this.listingResource.isLoading());
  protected readonly selectedCount = computed(() => this.selectedListings().length);

  protected readonly generationStatus = computed(() => {
    const index = this.generationStepIndex();
    return this.aiProgressMessages[index] ?? this.aiProgressMessages[0];
  });

  private submittedAt: number | null = null;

  protected onSubmit(): void {
    if (this.loading()) return;
    this.submittedAt = Date.now();

    this.error.set(null);
    this.directResult.set(null);
    this.generated.emit(null);
    this.batchProgress.set(null);

    const value = this.form.getRawValue();
    const listings = this.selectedListings();

    if (listings.length === 0) {
      this.error.set('Seleciona primeiro um ou mais listings da lista de pesquisa.');
      return;
    }

    const fields: AIListingEnrichmentRequestFieldsItem[] = [];
    if (value.target_title) fields.push('title');
    if (value.target_description) fields.push('description');
    if (value.target_meta_description) fields.push('meta_description');

    if (fields.length === 0) {
      this.error.set('Seleciona pelo menos um atributo para enriquecer.');
      return;
    }

    this.loading.set(true);
    this.batchProgress.set({ done: 0, total: listings.length });
    if (listings.length === 1) this.startGenerationProgress();

    if (listings.length === 1) {
      // Single listing — use enrichListing to get diff preview
      this.enrichmentService
        .enrichListing({
          listing_id: listings[0].id,
          fields,
          apply: false,
          force: value.force_regeneration,
        } satisfies AIListingEnrichmentRequest)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.stopGenerationProgress();
            this.loading.set(false);
          }),
        )
        .subscribe({
          next: (response) => {
            this.directResult.set(response);
            this.generated.emit(response);
            this.batchProgress.set({ done: 1, total: 1 });
            const changedCount = (response.results ?? []).filter((r) => r.changed).length;
            const duration = this.submittedAt ? (Date.now() - this.submittedAt) / 1000 : 0;
            this.success.emit({
              total_processed: 1,
              total_enriched: changedCount,
              total_errors: 0,
              duration_seconds: duration,
            });
          },
          error: (err: unknown) => this.error.set(extractErrorMessage(err)),
        });
    } else {
      // Multiple listings — use the bulk endpoint
      this.enrichmentService
        .bulkEnrichListings({
          listing_ids: listings.map((l) => l.id),
          fields: fields as BulkEnrichmentRequestFieldsItem[],
          force: value.force_regeneration,
        })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (response) => {
            const duration = this.submittedAt ? (Date.now() - this.submittedAt) / 1000 : 0;
            this.batchProgress.set({ done: response.enriched + response.skipped + response.failed, total: listings.length });
            this.success.emit({
              total_processed: response.total_requested,
              total_enriched: response.enriched,
              total_errors: response.failed,
              duration_seconds: duration,
            });
          },
          error: (err: unknown) => this.error.set(extractErrorMessage(err)),
        });
    }
  }

  private startGenerationProgress(): void {
    this.stopGenerationProgress();
    this.generationProgress.set(7);
    this.generationStepIndex.set(0);

    timer(650, 650)
      .pipe(takeUntil(this.progressStop$), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.generationProgress.update((current) => {
          const next = Math.min(current + 8, 94);
          const step = Math.min(
            Math.floor((next / 100) * this.aiProgressMessages.length),
            this.aiProgressMessages.length - 1,
          );
          this.generationStepIndex.set(step);
          return next;
        });
      });
  }

  private stopGenerationProgress(): void {
    this.progressStop$.next();
    this.generationProgress.set(0);
    this.generationStepIndex.set(0);
  }
}

function extractErrorMessage(err: unknown, fallback = 'Erro ao executar enrichment'): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}