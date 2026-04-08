import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { SiteConfigRead } from '../../../../../core/api/model';
import { SiteTestScrapeComponent } from '../../../components/site-test-scrape/site-test-scrape';

@Component({
  selector: 'app-step-test-scrape',
  imports: [SiteTestScrapeComponent],
  templateUrl: './step-test-scrape.html',
  styleUrl: './step-test-scrape.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTestScrapeComponent {
  site = input<SiteConfigRead | null>(null);

  back = output<void>();
  skip = output<void>();
  next = output<void>();

  protected readonly siteKey = computed(() => this.site()?.key ?? '');
  protected readonly isLocked = computed(() => !this.site());
}
