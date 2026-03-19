import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EnrichmentStats } from '../../../../core/models/enrichment.model';

@Component({
  selector: 'app-enrichment-stats',
  templateUrl: './enrichment-stats.html',
  styleUrl: './enrichment-stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentStatsComponent {
  readonly stats = input.required<EnrichmentStats>();

  protected readonly sourceEntries = computed(() => {
    const stats = this.stats();
    if (!stats.by_source) return [];
    return Object.entries(stats.by_source);
  });

  protected readonly hasSources = computed(() => this.sourceEntries().length > 0);

  protected readonly formattedEnrichmentPercentage = computed(() => {
    const stats = this.stats();
    const percentage = stats.enrichment_percentage ?? 0;
    return percentage.toFixed(1);
  });

  protected formatSourcePercentage(entry: [string, { total: number; enriched_count: number }]) {
    const [, data] = entry;
    if (data.total === 0) return '0.0';
    return ((data.enriched_count / data.total) * 100).toFixed(1);
  }
}
