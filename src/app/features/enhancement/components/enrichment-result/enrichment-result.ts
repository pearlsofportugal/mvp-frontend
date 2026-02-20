import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EnrichmentResult } from '../../../../core/models/enrichment.model';

@Component({
  selector: 'app-enrichment-result',
  imports: [],
  templateUrl: './enrichment-result.html',
  styleUrl: './enrichment-result.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentResultComponent {
  readonly result = input.required<EnrichmentResult>();

  protected readonly formattedDuration = computed(() => {
    const duration = this.result().duration_seconds;
    return typeof duration === 'number' && Number.isFinite(duration)
      ? `${duration.toFixed(2)}s`
      : '0.00s';
  });
}