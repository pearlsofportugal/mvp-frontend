import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import type {
  ListingTranslationResponse,
  LocaleEnrichmentOutput,
  ListingTranslationRequestLocalesItem,
} from '../../../../core/api/model';
import { Spinner } from '../../../../shared/components/spinner/spinner';
import { AutoResizeTextareaDirective } from '../../../../shared/directives/auto-resize-textarea.directive';

type LocaleCode = ListingTranslationRequestLocalesItem;

const ALL_LOCALES: LocaleCode[] = ['en', 'pt', 'es', 'fr', 'de'];

const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

@Component({
  selector: 'app-translation-panel',
  imports: [ReactiveFormsModule, Spinner, AutoResizeTextareaDirective],
  templateUrl: './translation-panel.html',
  styleUrl: './translation-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationPanelComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly listingId = input<string | null>(null);

  protected readonly allLocales = ALL_LOCALES;
  protected readonly localeLabels = LOCALE_LABELS;

  protected readonly selectedLocales = signal<Set<LocaleCode>>(new Set(ALL_LOCALES));
  protected readonly force = signal(false);
  protected readonly keywordsControl = new FormControl('', { nonNullable: true });

  protected readonly loading = signal(false);
  protected readonly applying = signal(false);
  protected readonly result = signal<ListingTranslationResponse | null>(null);
  protected readonly activeLocale = signal<LocaleCode>('pt');
  protected readonly error = signal<string | null>(null);
  protected readonly editedResults = signal<Record<string, LocaleEnrichmentOutput>>({});

  private readonly _resetOnListingChange = effect(() => {
    if (!this.listingId()) {
      this.result.set(null);
      this.error.set(null);
      this.editedResults.set({});
    }
  });

  protected readonly hasResult = computed(() => this.result() !== null);
  protected readonly isApplied = computed(() => this.result()?.applied === true);

  protected readonly hasAnyLocaleInResults = computed(() =>
    Object.keys(this.editedResults()).length > 0,
  );

  protected readonly activeLocaleResult = computed<LocaleEnrichmentOutput | null>(
    () => this.editedResults()[this.activeLocale()] ?? null,
  );

  protected readonly localeStatus = computed(() => {
    const r = this.result();
    const status: Record<string, 'new' | 'cached' | 'none'> = {};
    for (const l of ALL_LOCALES) {
      if ((r?.locales_generated ?? []).some((x) => x === l)) status[l] = 'new';
      else if ((r?.locales_cached ?? []).some((x) => x === l)) status[l] = 'cached';
      else status[l] = 'none';
    }
    return status;
  });

  protected readonly activeTitleLength = computed(
    () => (this.editedResults()[this.activeLocale()]?.title ?? '').length,
  );

  protected readonly activeMetaLength = computed(
    () => (this.editedResults()[this.activeLocale()]?.meta_description ?? '').length,
  );

  protected toggleLocale(locale: LocaleCode): void {
    this.selectedLocales.update((set) => {
      const next = new Set(set);
      if (next.has(locale)) next.delete(locale);
      else next.add(locale);
      return next;
    });
  }

  protected setActiveLocale(locale: LocaleCode): void {
    this.activeLocale.set(locale);
  }

  protected onEditField(field: keyof LocaleEnrichmentOutput, value: string): void {
    const locale = this.activeLocale();
    this.editedResults.update((r) => ({
      ...r,
      [locale]: { ...r[locale], [field]: value },
    }));
  }

  protected onGenerate(): void {
    if (this.loading()) return;
    const listingId = this.listingId();
    if (!listingId || this.selectedLocales().size === 0) return;

    const keywords = this.keywordsControl.value
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.editedResults.set({});

    this.enrichmentService
      .translateListing({
        listing_id: listingId,
        locales: [...this.selectedLocales()] as ListingTranslationRequestLocalesItem[],
        keywords: keywords.length ? keywords : undefined,
        force: this.force(),
        apply: false,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.result.set(response);
          const edited: Record<string, LocaleEnrichmentOutput> = {};
          for (const [locale, output] of Object.entries(response.results ?? {})) {
            edited[locale] = { ...output };
          }
          this.editedResults.set(edited);
          const firstLocale = response.locales_generated?.[0] ?? response.locales_cached?.[0];
          if (firstLocale) this.activeLocale.set(firstLocale);
        },
        error: (err: unknown) => this.error.set(extractErrorMessage(err)),
      });
  }

  protected onApply(): void {
    if (this.applying()) return;
    const listingId = this.listingId();
    if (!listingId) return;

    this.applying.set(true);
    this.enrichmentService
      .translateListing({
        listing_id: listingId,
        apply: true,
        translation_values: this.editedResults(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applying.set(false)),
      )
      .subscribe({
        next: (response) => this.result.set(response),
        error: (err: unknown) => this.error.set(extractErrorMessage(err)),
      });
  }
}

function extractErrorMessage(err: unknown, fallback = 'Translation failed'): string {
  if (!(err instanceof Error)) return fallback;
  return err.message || fallback;
}
