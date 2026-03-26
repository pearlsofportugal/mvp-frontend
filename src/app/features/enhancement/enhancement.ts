import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { EnrichmentFormComponent } from './components/enrichment-form/enrichment-form';
import { EnrichmentStatsComponent } from './components/enrichment-stats/enrichment-stats';
import { EnrichmentService } from '../../core/services/enrichment.service';
import { EnrichmentResult, EnrichmentStats } from '../../core/models/enrichment.model';
import type { AIListingEnrichmentResponse } from '../../core/api/model';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-enrichment',
  imports: [
    EnrichmentFormComponent,
    EnrichmentStatsComponent,
    DecimalPipe,
  ],
  templateUrl: './enhancement.html',
  styleUrl: './enhancement.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnhancementComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly statsRefreshTick = signal(0);

  protected readonly result = signal<EnrichmentResult | null>(null);
  protected readonly selectedListingId = signal<string | null>(null);
  protected readonly directResult = signal<AIListingEnrichmentResponse | null>(null);
  protected readonly editedValues = signal<Partial<Record<string, string>>>({});
  protected readonly applyingResult = signal(false);

  readonly statsResource = rxResource<EnrichmentStats, number>({
    params: () => this.statsRefreshTick(),
    stream: () => this.enrichmentService.getStats(),
  });

  protected readonly stats = computed(() => this.statsResource.value() ?? null);
  protected readonly loading = computed(() => this.statsResource.isLoading());
  protected readonly error = computed<string | null>(() => {
    const err = this.statsResource.error();
    if (!err) return null;
    return err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
  });
  protected readonly changedCount = computed(
    () => this.directResult()?.results?.filter((item) => item.changed).length ?? 0,
  );
  protected readonly unchangedCount = computed(
    () => this.directResult()?.results?.filter((item) => !item.changed).length ?? 0,
  );
  protected readonly hasDirectResults = computed(
    () => (this.directResult()?.results?.length ?? 0) > 0,
  );

  readonly viewState = computed(() => {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';
    if (this.stats()) return 'data';
    return 'empty';
  });

  onEnrichmentSuccess(res: EnrichmentResult): void {
    this.result.set(res);
    this.reloadStats();
  }

  onListingSelected(listingId: string): void {
    this.selectedListingId.set(listingId);
  }

  onGenerated(res: AIListingEnrichmentResponse | null): void {
    this.directResult.set(res);
    if (res) {
      const edited: Partial<Record<string, string>> = {};
      for (const r of res.results ?? []) {
        if (r.changed && r.enriched != null) edited[r.field] = r.enriched;
      }
      this.editedValues.set(edited);
    } else {
      this.editedValues.set({});
    }
  }

  onEditField(field: string, value: string): void {
    this.editedValues.update((v) => ({ ...v, [field]: value }));
  }

  onApplyResult(): void {
    if (this.applyingResult()) return;
    const listingId = this.selectedListingId();
    if (!listingId) return;

    this.applyingResult.set(true);
    const enrichedValues = Object.fromEntries(
      Object.entries(this.editedValues()).filter((e): e is [string, string] => e[1] != null),
    );
    this.enrichmentService
      .applyListingEnrichment(listingId, enrichedValues)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingResult.set(false)),
      )
      .subscribe({
        next: (response) => this.directResult.set(response),
      });
  }

  protected reloadStats(): void {
    this.statsRefreshTick.update((tick) => tick + 1);
  }
}
