import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { EnrichmentFormComponent } from './components/enrichment-form/enrichment-form';
import { EnrichmentResultComponent } from './components/enrichment-result/enrichment-result';
import { EnrichmentPreviewComponent } from './components/enrichment-preview/enrichment-preview';
import { EnrichmentStatsComponent } from './components/enrichment-stats/enrichment-stats';
import { EnrichmentService } from '../../core/services/enrichment.service';
import { EnrichmentResult, EnrichmentStats } from '../../core/models/enrichment.model';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-enrichment',
  imports: [
    EnrichmentFormComponent,
    EnrichmentResultComponent,
    EnrichmentPreviewComponent,
    EnrichmentStatsComponent,
    DecimalPipe
  ],
  templateUrl: './enhancement.html',
  styleUrl: './enhancement.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnhancementComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly statsRefreshTick = signal(0);

  protected readonly result = signal<EnrichmentResult | null>(null);
  protected readonly selectedListingId = signal<string | null>(null);

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

  protected reloadStats(): void {
    this.statsRefreshTick.update((tick) => tick + 1);
  }
}
