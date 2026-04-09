import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { EnrichmentFormComponent } from './components/enrichment-form/enrichment-form';
import { EnrichmentStatsComponent } from './components/enrichment-stats/enrichment-stats';
import { TranslationPanelComponent } from './components/translation-panel/translation-panel';
import { EnrichmentService } from '../../core/services/enrichment.service';
import { EnrichmentResult, EnrichmentStats } from '../../core/models/enrichment.model';
import { DecimalPipe } from '@angular/common';
import { Spinner } from '../../shared/components/spinner/spinner';
import { ListingSelectorComponent } from '../listings/components/listing-selector/listing-selector';
import type { ListingSearchItem } from '../../core/api/model';

type Tab = 'enrich' | 'stats';

@Component({
  selector: 'app-enrichment',
  imports: [
    EnrichmentFormComponent,
    EnrichmentStatsComponent,
    TranslationPanelComponent,
    ListingSelectorComponent,
    DecimalPipe,
    Spinner,
  ],
  templateUrl: './enhancement.html',
  styleUrl: './enhancement.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnhancementComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly statsRefreshTick = signal(0);

  protected readonly activeTab = signal<Tab>('enrich');
  protected readonly result = signal<EnrichmentResult | null>(null);
  protected readonly selectedListings = signal<ListingSearchItem[]>([]);
  protected readonly selectedCount = computed(() => this.selectedListings().length);
  protected readonly selectedListingId = computed(() => this.selectedListings()[0]?.id ?? null);

  readonly statsResource = rxResource<EnrichmentStats, number>({
    params: () => this.statsRefreshTick(),
    stream: () => this.enrichmentService.getStats(),
  });

  protected readonly stats = computed(() => this.statsResource.value() ?? null);
  protected readonly statsLoading = computed(() => this.statsResource.isLoading());
  protected readonly statsError = computed<string | null>(() => {
    const err = this.statsResource.error();
    if (!err) return null;
    return err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
  });

  readonly statsViewState = computed(() => {
    if (this.statsLoading()) return 'loading';
    if (this.statsError()) return 'error';
    if (this.stats()) return 'data';
    return 'empty';
  });

  protected onListingsConfirmed(listings: ListingSearchItem[]): void {
    this.selectedListings.set(listings);
  }

  protected onEnrichmentSuccess(res: EnrichmentResult): void {
    this.result.set(res);
    this.reloadStats();
  }

  protected reloadStats(): void {
    this.statsRefreshTick.update((tick) => tick + 1);
  }
}
