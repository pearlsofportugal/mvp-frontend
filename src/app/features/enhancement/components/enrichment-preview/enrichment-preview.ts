import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import { EnrichmentPreview } from '../../../../core/models/enrichment.model';

@Component({
  selector: 'app-enrichment-preview',
  imports: [],
  templateUrl: './enrichment-preview.html',
  styleUrl: './enrichment-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentPreviewComponent {
  private readonly enrichmentService = inject(EnrichmentService);

  readonly listingId = input<string | null>(null);
  private readonly previewListingId = signal<string | null>(null);


  private lastSeenListingId: string | null = null;

  readonly previewResource = rxResource<EnrichmentPreview | null, string | null>({
    params: () => this.previewListingId(),
    stream: ({ params }) =>
      params ? this.enrichmentService.previewEnrichment(params) : of(null),
  });

  protected readonly preview = computed(() => this.previewResource.value() ?? null);
  protected readonly loading = computed(() => this.previewResource.isLoading());
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
      const id = this.listingId();
      if (id === this.lastSeenListingId) return;
      this.lastSeenListingId = id;
      this.previewListingId.set(null);
    });
  }

  protected onRefresh(): void {
    const id = this.listingId();
    if (!id) return;
    this.previewListingId.set(id);
  }
}