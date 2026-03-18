import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../core/services/sites.service';
import type { SiteConfigPreviewResponse } from '../../../../core/api/model';

@Component({
  selector: 'app-site-preview',
  templateUrl: './site-preview.html',
  styleUrl: './site-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitePreviewComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  url = input.required<string>();
  selector = input.required<string>();

  protected readonly loading = signal(false);
  protected readonly result = signal<SiteConfigPreviewResponse | null>(null);
  protected readonly hasRun = signal(false);

  protected readonly canTest = computed(() => this.url().length > 0 && this.selector().length > 0);

  protected readonly samples = computed(() => (this.result()?.preview ?? []).slice(0, 3));

  onTest(): void {
    if (!this.canTest()) return;
    this.loading.set(true);
    this.hasRun.set(true);
    this.result.set(null);
    this.sitesService.previewSelector(this.url(), this.selector()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
