import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import { EnrichmentResult } from '../../../../core/models/enrichment.model';
import type {
  BulkEnrichmentRequestLocalesItem,
  ListingSearchItem,
} from '../../../../core/api/model';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';

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
  protected readonly selectedCount = computed(() => this.listings().length);

  protected toggleLocale(locale: LocaleCode): void {
    this.selectedLocales.update((set) => {
      const next = new Set(set);
      if (next.has(locale)) next.delete(locale);
      else next.add(locale);
      return next;
    });
  }

  private submittedAt: number | null = null;

  protected onSubmit(): void {
    if (this.loading()) return;
    this.submittedAt = Date.now();

    this.error.set(null);
    this.lastResult.set(null);

    const listings = this.listings();

    if (this.selectedLocales().size === 0) {
      this.error.set('Select at least one locale.');
      return;
    }

    this.submittedCount.set(listings.length);
    this.loading.set(true);

    this.enrichmentService
      .bulkEnrichListings({
        listing_ids: listings.map((l) => l.id),
        locales: [...this.selectedLocales()] as LocaleCode[],
        force: this.force(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const duration = this.submittedAt ? (Date.now() - this.submittedAt) / 1000 : 0;
          this.lastResult.set({
            enriched: response.enriched,
            skipped: response.skipped,
            failed: response.failed,
            duration,
          });
          this.success.emit({
            total_processed: response.total_requested,
            total_enriched: response.enriched,
            total_errors: response.failed,
            duration_seconds: duration,
          });
        },
        error: (err: unknown) => this.error.set(extractErrorMessage(err)),
      });
  }
}

function extractErrorMessage(err: unknown, fallback = 'Erro ao executar enrichment'): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}