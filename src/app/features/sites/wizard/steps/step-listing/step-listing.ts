import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { SiteConfigRead } from '../../../../../core/api/model';
import { SiteTestListingComponent } from '../../../components/site-test-listing/site-test-listing';

@Component({
  selector: 'app-step-listing',
  imports: [SiteTestListingComponent],
  templateUrl: './step-listing.html',
  styleUrl: './step-listing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepListingComponent {
  site = input<SiteConfigRead | null>(null);

  back = output<void>();
  skip = output<void>();
  next = output<void>();

  protected readonly siteKey = computed(() => this.site()?.key ?? '');
  protected readonly savedLinkPattern = computed(() => this.site()?.link_pattern ?? '');
  protected readonly isLocked = computed(() => !this.site());
}
