import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import type { ListingTranslationResponse } from '../../../../core/api/model';
import { Spinner } from '../../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-enrichment-preview',
  imports: [Spinner],
  templateUrl: './enrichment-preview.html',
  styleUrl: './enrichment-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentPreviewComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly listingId = input<string | null>(null);

  protected readonly loading = signal(false);
  protected readonly result = signal<ListingTranslationResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly previewOriginalDescription = computed(() =>
    (this.result()?.results?.['en'] as { description?: string | null } | undefined)?.description ?? null,
  );
  protected readonly previewEnrichedDescription = computed(() =>
    (this.result()?.results?.['en'] as { description?: string | null } | undefined)?.description ?? null,
  );

  protected onRefresh(): void {
    const id = this.listingId();
    if (!id || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.enrichmentService
      .translateListing({ listing_id: id, locales: ['en'], apply: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (r) => this.result.set(r),
        error: (err: unknown) =>
          this.error.set(err instanceof Error ? err.message : 'Error loading preview'),
      });
  }
}
