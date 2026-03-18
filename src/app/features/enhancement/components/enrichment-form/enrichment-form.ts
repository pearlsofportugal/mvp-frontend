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
  ListingRead,
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
  apply_changes: FormControl<boolean>;
  force_regeneration: FormControl<boolean>;
}>;

@Component({
  selector: 'app-enrichment-form',
  imports: [ReactiveFormsModule, ListingSelectorComponent, DecimalPipe
  ],
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

  protected readonly form: EnrichmentFormGroup = new FormGroup({
    target_title: new FormControl(false, { nonNullable: true }),
    target_description: new FormControl(true, { nonNullable: true }),
    target_meta_description: new FormControl(false, { nonNullable: true }),
    apply_changes: new FormControl(true, { nonNullable: true }),
    force_regeneration: new FormControl(false, { nonNullable: true }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedListingId = signal<string | null>(null);
  protected readonly directResult = signal<AIListingEnrichmentResponse | null>(null);
  protected readonly generationProgress = signal(0);
  protected readonly generationStepIndex = signal(0);

  protected onListingConfirmed(listing: ListingSearchItem): void {
    this.selectedListingId.set(listing.id);
    this.directResult.set(null);
    this.error.set(null);
    this.listingSelected.emit(listing.id);
  }

  readonly listingResource = rxResource<ListingRead | null, string | null>({
    params: () => this.selectedListingId(),
    stream: ({ params }) => (params ? this.realEstateService.getListingById(params) : of(null)),
  });

  protected readonly selectedListing = computed(() => this.listingResource.value() ?? null);
  protected readonly loadingListing = computed(() => this.listingResource.isLoading());

  protected readonly changedCount = computed(
    () => this.directResult()?.results?.filter((item) => item.changed).length ?? 0,
  );
  protected readonly unchangedCount = computed(
    () => this.directResult()?.results?.filter((item) => !item.changed).length ?? 0,
  );
  protected readonly hasDirectResults = computed(
    () => (this.directResult()?.results?.length ?? 0) > 0,
  );
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

    const value = this.form.getRawValue();
    const listingId = this.selectedListingId();

    const fields: AIListingEnrichmentRequestFieldsItem[] = [];
    if (value.target_title) fields.push('title');
    if (value.target_description) fields.push('description');
    if (value.target_meta_description) fields.push('meta_description');

    if (!listingId) {
      this.error.set('Seleciona primeiro um listing da lista de pesquisa.');
      return;
    }

    if (fields.length === 0) {
      this.error.set('Seleciona pelo menos um atributo para enriquecer.');
      return;
    }

    this.loading.set(true);
    this.startGenerationProgress();

    const request: AIListingEnrichmentRequest = {
      listing_id: listingId,
      fields,
      apply: value.apply_changes,
      force: value.force_regeneration,
    };

    this.enrichmentService
      .enrichListing(request)
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