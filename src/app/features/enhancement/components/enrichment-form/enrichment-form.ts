// src/app/features/enhancement/components/enrichment-form/enrichment-form.ts
//
// FIX (prioridade média): Error handling melhorado no subscribe do enrichListing.
//
// ANTES:
//   error: (err: unknown) => this.error.set('Erro ao executar enrichment')
//   A mensagem real do backend (ex: "Listing not found", "google_genai_api_key is not configured")
//   era descartada silenciosamente. O utilizador via sempre a mesma mensagem genérica,
//   mesmo que o toast do interceptor mostrasse a mensagem correta.
//
// DEPOIS:
//   Extrai a mensagem da estrutura de erro do backend (ApiResponse.message ou errors[0])
//   e mostra-a no componente. O toast do interceptor continua a funcionar em paralelo —
//   o componente mostra o erro inline, o toast mostra-o no canto do ecrã.

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
import { HttpErrorResponse } from '@angular/common/http';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import {
  AIListingEnrichmentResponse,
  AIListingEnrichmentRequest,
  AIEnrichmentTargetField,
  EnrichmentResult,
} from '../../../../core/models/enrichment.model';
import { RealEstateService } from '../../../../core/services/listings.service';
import { RealEstate, RealEstateListItem } from '../../../../core/models/listing.model';
import { of, finalize, map, debounceTime, switchMap } from 'rxjs';

type EnrichmentFormGroup = FormGroup<{
  target_title: FormControl<boolean>;
  target_description: FormControl<boolean>;
  target_meta_description: FormControl<boolean>;
  apply_changes: FormControl<boolean>;
  force_regeneration: FormControl<boolean>;
}>;

@Component({
  selector: 'app-enrichment-form',
  imports: [ReactiveFormsModule],
  templateUrl: './enrichment-form.html',
  styleUrl: './enrichment-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentFormComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly realEstateService = inject(RealEstateService);
  private readonly destroyRef = inject(DestroyRef);
  private progressTimer: ReturnType<typeof setInterval> | null = null;

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
  private readonly selectedListingId = signal<string | null>(null);
  private readonly listingSearchQuery = signal<string>('');
  protected readonly directResult = signal<AIListingEnrichmentResponse | null>(null);
  protected readonly generationProgress = signal(0);
  protected readonly generationStepIndex = signal(0);

  readonly listingCandidatesResource = rxResource<RealEstateListItem[], string>({
    params: () => this.listingSearchQuery(),
    stream: ({ params }) => {
      const query = params.trim();
      if (!query || query.length < 2) return of([]);
      return of(query).pipe(
        debounceTime(300),
        switchMap((q) =>
          this.realEstateService
            .getListings({
              search: q,
              page: 1,
              page_size: 10,
              sort_by: 'updated_at',
              sort_order: 'desc',
            })
            .pipe(map((res) => res.items)),
        ),
      );
    },
    defaultValue: [],
  });

  readonly listingResource = rxResource<RealEstate | null, string | null>({
    params: () => this.selectedListingId(),
    stream: ({ params }) => (params ? this.realEstateService.getListingById(params) : of(null)),
  });

  protected readonly selectedListing = computed(() => this.listingResource.value() ?? null);
  protected readonly listingCandidates = computed(
    () => this.listingCandidatesResource.value() ?? [],
  );
  protected readonly loadingCandidates = computed(() => this.listingCandidatesResource.isLoading());
  protected readonly loadingListing = computed(() => this.listingResource.isLoading());
  protected readonly changedCount = computed(
    () => this.directResult()?.results.filter((item) => item.changed).length ?? 0,
  );
  protected readonly unchangedCount = computed(
    () => this.directResult()?.results.filter((item) => !item.changed).length ?? 0,
  );
  protected readonly hasTypedSearch = computed(() => this.listingSearchQuery().trim().length >= 2);
  protected readonly generationStatus = computed(() => {
    const index = this.generationStepIndex();
    return this.aiProgressMessages[index] ?? this.aiProgressMessages[0];
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopGenerationProgress());
  }

  private submittedAt: number | null = null;

  protected onSubmit(): void {
    if (this.loading()) return;
    this.submittedAt = Date.now();

    this.error.set(null);
    this.directResult.set(null);

    const value = this.form.getRawValue();
    const listingId = this.selectedListingId();

    const fields: AIEnrichmentTargetField[] = [];
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

    const directRequest: AIListingEnrichmentRequest = {
      listing_id: listingId,
      fields,
      apply: value.apply_changes,
      force: value.force_regeneration,
    };

    this.enrichmentService
      .enrichListing(directRequest)
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
          const changedCount = response.results.filter((r) => r.changed).length;
          const duration = this.submittedAt ? (Date.now() - this.submittedAt) / 1000 : 0;

          this.success.emit({
            total_processed: 1,
            total_enriched: changedCount,
            total_errors: 0,
            duration_seconds: duration,
          });
        },
        // FIX: extrair mensagem real do backend em vez de mensagem genérica
        error: (err: unknown) => this.error.set(extractErrorMessage(err)),
      });
  }

  protected readonly hasDirectResults = computed(
    () => (this.directResult()?.results.length ?? 0) > 0,
  );

  protected onSearchListings(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.listingSearchQuery.set(input.value ?? '');
  }

  protected onSelectListing(listing: RealEstateListItem): void {
    this.selectedListingId.set(listing.id);
    this.listingSearchQuery.set(listing.title ?? listing.id);
    this.listingSelected.emit(listing.id);
    this.directResult.set(null);
    this.error.set(null);
  }

  private startGenerationProgress(): void {
    this.stopGenerationProgress();
    this.generationProgress.set(7);
    this.generationStepIndex.set(0);

    this.progressTimer = setInterval(() => {
      this.generationProgress.update((current) => {
        const next = Math.min(current + 8, 94);
        const step = Math.min(
          Math.floor((next / 100) * this.aiProgressMessages.length),
          this.aiProgressMessages.length - 1,
        );
        this.generationStepIndex.set(step);
        return next;
      });
    }, 650);
  }

  private stopGenerationProgress(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.generationProgress.set(0);
    this.generationStepIndex.set(0);
  }
}

/**
 * Extrai a mensagem de erro mais útil da resposta do backend.
 *
 * O backend retorna erros nestes formatos:
 *   1. ApiResponse: { success: false, message: "...", errors: ["..."] }
 *   2. FastAPI validation: { detail: [{ msg: "..." }] }
 *   3. FastAPI HTTPException: { detail: "..." }
 *   4. Erro de rede: sem body (err.status === 0)
 *
 * O interceptor já mostra um toast — esta função serve para o erro inline
 * no componente, que fornece contexto adicional ao utilizador.
 */
function extractErrorMessage(err: unknown, fallback = 'Erro ao executar enrichment'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error ? err.message : fallback;
  }

  if (err.status === 0) {
    return 'Sem ligação ao servidor. Verifica se o backend está ativo.';
  }

  if (err.status === 401) {
    return 'Não autorizado. Verifica a API key configurada.';
  }

  const body = err.error;
  if (!body) return `Erro ${err.status}: ${fallback}`;

  // Formato ApiResponse (backend próprio)
  if (typeof body.message === 'string' && body.message) return body.message;
  if (Array.isArray(body.errors) && body.errors.length > 0) return body.errors[0];

  // Formato FastAPI HTTPException padrão
  if (typeof body.detail === 'string') return body.detail;

  // FastAPI validation errors (array)
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return body.detail[0]?.msg ?? fallback;
  }

  return `Erro ${err.status}: ${fallback}`;
}