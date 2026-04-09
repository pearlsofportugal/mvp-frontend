import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import type { TestListingPageResponse } from '../../../../core/api/model';

@Component({
  selector: 'app-site-test-listing',
  imports: [FormsModule],
  templateUrl: './site-test-listing.html',
  styleUrl: './site-test-listing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteTestListingComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  siteKey = input.required<string>();
  /** Saved link_pattern from site config — pre-filled but overridable. */
  savedLinkPattern = input<string>('');

  protected testUrl = signal('');
  protected linkPatternOverride = signal('');
  protected thumbnailSelector = signal('');
  protected testing = signal(false);
  protected result = signal<TestListingPageResponse | null>(null);

  protected readonly testStatus = computed<'idle' | 'success' | 'warning' | 'error'>(() => {
    const r = this.result();
    if (!r) return 'idle';
    if (!r.success) return 'error';
    if (r.links_matched === 0) return 'warning';
    return 'success';
  });

  protected readonly matchRate = computed(() => {
    const r = this.result();
    if (!r || r.links_found === 0) return null;
    return Math.round((r.links_matched / r.links_found) * 100);
  });

  protected readonly canTest = computed(() => this.testUrl().trim().length > 0);

  protected onRun(): void {
    const url = this.testUrl().trim();
    if (!url) return;

    const pattern = this.linkPatternOverride().trim() || null;
    const thumb = this.thumbnailSelector().trim() || null;

    this.testing.set(true);
    this.result.set(null);

    this.sitesService
      .testListingPage(this.siteKey(), url, pattern, thumb)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.testing.set(false);
        },
        error: () => {
          this.testing.set(false);
        },
      });
  }
}
