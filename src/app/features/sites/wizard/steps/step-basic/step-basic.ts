import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../../core/services/sites.service';
import type { SiteConfigRead } from '../../../../../core/api/model';

type ExtractionMode = 'section' | 'direct';
type PaginationType = 'html_next' | 'query_param' | 'incremental_path';

@Component({
  selector: 'app-step-basic',
  imports: [ReactiveFormsModule],
  templateUrl: './step-basic.html',
  styleUrl: './step-basic.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepBasicComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfigRead | null>(null);

  siteCreated = output<SiteConfigRead>();
  siteUpdated = output<SiteConfigRead>();
  next = output<void>();
  cancelled = output<void>();

  protected readonly submitting = signal(false);

  protected readonly isEditMode = computed(() => !!this.site());

  protected readonly form = new FormGroup({
    key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)],
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    base_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    }),
    extraction_mode: new FormControl<ExtractionMode>('direct', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    pagination_type: new FormControl<PaginationType | ''>('', { nonNullable: true }),
    pagination_param: new FormControl('', { nonNullable: true }),
    link_pattern: new FormControl('', { nonNullable: true }),
    image_filter: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const currentSite = this.site();
      if (currentSite) {
        this.form.patchValue({
          key: currentSite.key,
          name: currentSite.name,
          base_url: currentSite.base_url,
          extraction_mode: (currentSite.extraction_mode as ExtractionMode | undefined) ?? 'direct',
          pagination_type: (currentSite.pagination_type as PaginationType | undefined) ?? '',
          pagination_param: currentSite.pagination_param ?? '',
          link_pattern: currentSite.link_pattern ?? '',
          image_filter: currentSite.image_filter ?? '',
        });
        this.form.controls.key.disable();
      }
    });
  }

  protected showPaginationParam(): boolean {
    return this.form.controls.pagination_type.value === 'query_param';
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const payload = {
      key: raw.key,
      name: raw.name,
      base_url: raw.base_url,
      extraction_mode: raw.extraction_mode,
      pagination_type: raw.pagination_type || undefined,
      pagination_param: raw.pagination_param || undefined,
      link_pattern: raw.link_pattern || undefined,
      image_filter: raw.image_filter || undefined,
    };

    const currentSite = this.site();

    if (currentSite) {
      this.sitesService
        .update(currentSite.key, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.submitting.set(false);
            this.siteUpdated.emit(updated);
            this.next.emit();
          },
          error: () => { this.submitting.set(false); },
        });
    } else {
      this.sitesService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.submitting.set(false);
            this.siteCreated.emit(created);
          },
          error: () => { this.submitting.set(false); },
        });
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
