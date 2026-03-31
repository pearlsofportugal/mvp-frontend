import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import type { AIListingEnrichmentResponse } from '../../../../core/api/model';
import { Spinner } from "../../../../shared/components/spinner/spinner";

@Component({
  selector: 'app-enrichment-preview',
  imports: [Spinner],
  templateUrl: './enrichment-preview.html',
  styleUrl: './enrichment-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentPreviewComponent {
  private readonly enrichmentService = inject(EnrichmentService);

  readonly listingId = input<string | null>(null);
  private readonly previewListingId = signal<string | null>(null);

  readonly previewResource = rxResource<AIListingEnrichmentResponse | null, string | null>({
    params: () => this.previewListingId(),
    stream: ({ params }) =>
      params ? this.enrichmentService.enrichListing({ listing_id: params }) : of(null),
  });

  protected readonly preview = computed(() => this.previewResource.value() ?? null);
  protected readonly loading = computed(() => this.previewResource.isLoading());

  protected readonly previewOriginalDescription = computed(() =>
    this.preview()?.results?.find(r => r.field === 'description')?.original ?? null
  );
  protected readonly previewEnrichedDescription = computed(() =>
    this.preview()?.results?.find(r => r.field === 'description')?.enriched ?? null
  );
  protected readonly error = computed<string | null>(() => {
    const err = this.previewResource.error();
    if (!err) return null;
    if (err && typeof err === 'object' && 'error' in err) {
      return (
        (err as { error?: { detail?: string } }).error?.detail ??
        'Error loading preview'
      );
    }
    return err instanceof Error ? err.message : 'Error loading preview';
  });

  constructor() {
    effect(() => {
      const incoming = this.listingId();
      const current = untracked(() => this.previewListingId());
      if (current !== null && current !== incoming) {
        this.previewListingId.set(null);
      }
    });
  }

  protected onRefresh(): void {
    const id = this.listingId();
    if (!id) return;
    if (this.previewListingId() === id) {
      this.previewResource.reload();
    } else {
      this.previewListingId.set(id);
    }
  }
}