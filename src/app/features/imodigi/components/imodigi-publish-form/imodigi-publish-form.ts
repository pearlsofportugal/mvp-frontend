import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, finalize } from 'rxjs';

import { ImodigiService } from '../../../../core/services/imodigi.service';
import type { BulkJobStatus, ListingSearchItem } from '../../../../core/api/model';

@Component({
  selector: 'app-imodigi-publish-form',
  imports: [DecimalPipe],
  templateUrl: './imodigi-publish-form.html',
  styleUrl: './imodigi-publish-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImodigiPublishFormComponent {
  private readonly imodigiService = inject(ImodigiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly listings = input.required<ListingSearchItem[]>();
  readonly clientId = input<number | null>(null);
  readonly success = output<{ published: number; failed: number; duration: number }>();

  protected readonly selectedCount = computed(() => this.listings().length);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly progress = signal<{ done: number; total: number; pct: number } | null>(null);
  protected readonly lastResult = signal<{ published: number; failed: number; skipped: number; duration: number } | null>(null);
  protected readonly submittedCount = signal(0);

  private submittedAt: number | null = null;

  protected onSubmit(): void {
    if (this.loading() || !isPlatformBrowser(this.platformId)) return;

    const listings = this.listings();
    if (listings.length === 0) return;

    this.submittedAt = Date.now();
    this.error.set(null);
    this.lastResult.set(null);
    this.progress.set(null);
    this.submittedCount.set(listings.length);
    this.loading.set(true);

    const clientId = this.clientId();

    this.imodigiService
      .bulkPublish({
        listing_ids: listings.map((l) => l.id),
        client_id: clientId,
      })
      .pipe(
        switchMap((accepted) => {
          this.progress.set({ done: 0, total: accepted.total, pct: 0 });
          return this.imodigiService.streamBulkPublishJob(accepted.job_id);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (status: BulkJobStatus) => {
          this.progress.set({
            done: status.done,
            total: status.total,
            pct: status.progress_pct,
          });

          if (status.status === 'completed' || status.status === 'failed') {
            const duration = this.submittedAt ? (Date.now() - this.submittedAt) / 1000 : 0;
            this.lastResult.set({
              published: status.done,
              failed: status.failed,
              skipped: status.skipped,
              duration,
            });
            this.progress.set(null);
            this.success.emit({
              published: status.done,
              failed: status.failed,
              duration,
            });
          }
        },
        error: (err: unknown) => {
          this.progress.set(null);
          this.error.set(extractErrorMessage(err));
        },
      });
  }
}

function extractErrorMessage(err: unknown, fallback = 'Erro ao publicar no Imodigi'): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}
