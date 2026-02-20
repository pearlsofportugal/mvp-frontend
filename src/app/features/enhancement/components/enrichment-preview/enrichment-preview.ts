import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { EnrichmentService } from '../../../../core/services/enrichment.service';
import { EnrichmentPreview } from '../../../../core/models/enrichment.model';

type EnrichmentPreviewForm = FormGroup<{
  listing_id: FormControl<string>;
}>;

@Component({
  selector: 'app-enrichment-preview',
  imports: [ReactiveFormsModule],
  templateUrl: './enrichment-preview.html',
  styleUrl: './enrichment-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrichmentPreviewComponent {
  private readonly enrichmentService = inject(EnrichmentService);
  readonly listingId = input<string | null>(null);

  protected readonly form: EnrichmentPreviewForm = new FormGroup({
    listing_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Signal driven — no manual subscribe
  private readonly previewListingId = signal<string | null>(null);

  readonly previewResource = rxResource<EnrichmentPreview | null, string | null>({
    params: () => this.previewListingId(),
    stream: ({ params }) =>
      params
        ? this.enrichmentService.previewEnrichment(params)
        : of(null),
  });

  protected readonly preview = computed(() => this.previewResource.value() ?? null);
  protected readonly loading = computed(() => this.previewResource.isLoading());
  protected readonly error = computed<string | null>(() => {
    const err = this.previewResource.error();
    if (!err) return null;
    if (err && typeof err === 'object' && 'error' in err) {
      return (
        (err as { error?: { detail?: string } }).error?.detail ??
        'Erro ao carregar preview'
      );
    }
    return err instanceof Error ? err.message : 'Erro ao carregar preview';
  });

  constructor() {
    effect(() => {
      const selectedListingId = this.listingId();
      if (!selectedListingId) {
        return;
      }

      this.form.controls.listing_id.setValue(selectedListingId);
      this.previewListingId.set(selectedListingId);
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const listingId = this.form.controls.listing_id.value.trim();
    if (!listingId) return;

    this.previewListingId.set(listingId);
  }
}