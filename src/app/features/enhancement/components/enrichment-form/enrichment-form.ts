import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import { EnrichmentResult } from '../../../../core/models/enrichment.model';
import type {
  BulkEnrichmentRequestLocalesItem,
  BulkJobStatus,
  ListingSearchItem,
} from '../../../../core/api/model';

type LocaleCode = BulkEnrichmentRequestLocalesItem;

const ALL_LOCALES: LocaleCode[] = ['en', 'pt', 'es', 'fr', 'de'];

const LOCALE_FLAGS: Record<LocaleCode, string> = {
  en: '🇬🇧',
  pt: '🇵🇹',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

@Component({
  selector: 'app-enrichment-form',
  imports: [DecimalPipe],
  templateUrl: './enrichment-form.html',
  styleUrl: './enrichment-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentFormComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly listings = input.required<ListingSearchItem[]>();
  readonly success = output<EnrichmentResult>();

  protected readonly allLocales = ALL_LOCALES;
  protected readonly localeFlags = LOCALE_FLAGS;

  protected readonly selectedLocales = signal<Set<LocaleCode>>(new Set(ALL_LOCALES));
  protected readonly force = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lastResult = signal<{ enriched: number; skipped: number; failed: number; duration: number } | null>(null);
  protected readonly submittedCount = signal(0);
  protected readonly progress = signal<{ done: number; total: number; pct: number } | null>(null);
  protected readonly selectedCount = computed(() => this.listings().length);

  private submittedAt: number | null = null;

  protected toggleLocale(locale: LocaleCode): void {
    this.selectedLocales.update((set) => {
      const next = new Set(set);
      if (next.has(locale)) next.delete(locale);
      else next.add(locale);
      return next;
    });
  }

  protected onSubmit(): void {
    if (this.loading() || !isPlatformBrowser(this.platformId)) return;

    if (this.selectedLocales().size === 0) {
      this.error.set('Select at least one locale.');
      return;
    }

    const listings = this.listings();
    this.submittedAt = Date.now();
    this.error.set(null);
    this.lastResult.set(null);
    this.progress.set(null);
    this.submittedCount.set(listings.length);
    this.loading.set(true);

    this.enrichmentService
      .bulkEnrichListings({
        listing_ids: listings.map((l) => l.id),
        locales: [...this.selectedLocales()] as LocaleCode[],
        force: this.force(),
      })
      .pipe(
        switchMap((accepted) => {
          this.progress.set({ done: 0, total: accepted.total, pct: 0 });
          return this.enrichmentService.streamBulkEnrichJob(accepted.job_id);
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
              enriched: status.done - status.failed,
              skipped: status.skipped,
              failed: status.failed,
              duration,
            });
            this.progress.set(null);
            this.success.emit({
              total_processed: status.total,
              total_enriched: status.done - status.failed,
              total_errors: status.failed,
              duration_seconds: duration,
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

function extractErrorMessage(err: unknown, fallback = 'Erro ao executar enrichment'): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}