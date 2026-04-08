import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { SiteConfigRead } from '../../../../../core/api/model';

@Component({
  selector: 'app-step-done',
  imports: [],
  templateUrl: './step-done.html',
  styleUrl: './step-done.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepDoneComponent {
  site = input<SiteConfigRead | null>(null);

  launchJob = output<void>();
  backToList = output<void>();
  editAgain = output<void>();

  protected readonly selectorCount = computed(() => {
    const site = this.site();
    if (!site?.selectors || typeof site.selectors !== 'object') return 0;
    return Object.values(site.selectors as Record<string, unknown>).filter(Boolean).length;
  });

  protected readonly averageConfidence = computed<number | null>(() => {
    const scores = this.site()?.confidence_scores;
    if (!scores || typeof scores !== 'object') return null;
    const values = Object.values(scores) as number[];
    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
  });

  protected confClass(score: number): string {
    if (score >= 80) return 'conf-high';
    if (score >= 50) return 'conf-mid';
    return 'conf-low';
  }
}
