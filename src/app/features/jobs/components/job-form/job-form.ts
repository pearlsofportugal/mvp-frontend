import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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

import { JobsService } from '../../../../core/services/jobs';
import { SitesService } from '../../../../core/services/sites.service';
import type { SiteConfigRead, JobCreate, SiteConfigPreviewResponse } from '../../../../core/api/model';
import { SelectDropdownComponent, SelectOption } from '../../../../shared/components/select-dropdown/select-dropdown';

type JobFormGroup = FormGroup<{
  site_key: FormControl<string>;
  start_url: FormControl<string>;
  max_pages: FormControl<number>;
}>;

@Component({
  selector: 'app-job-form',
  imports: [ReactiveFormsModule,SelectDropdownComponent],
  templateUrl: './job-form.html',
  styleUrl: './job-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobFormComponent {
  private readonly jobsService = inject(JobsService);
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sites = input.required<SiteConfigRead[]>();
  readonly jobCreated = output<void>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  // Track selected site key reactively for computed derivations
  protected readonly selectedSiteKey = signal('');
  protected readonly previewLoading = signal(false);
  protected readonly previewResult = signal<SiteConfigPreviewResponse | null>(null);
  protected readonly previewError = signal(false);

  protected readonly form: JobFormGroup = new FormGroup({
    site_key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    start_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    }),
    max_pages: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.min(1)],
    }),
  });

  protected readonly siteOptions = computed<SelectOption[]>(() =>
    this.sites().map((s) => ({ value: s.key, label: s.name ? `${s.name} · ${s.key}` : s.key }))
  );

  protected readonly selectedSite = computed<SiteConfigRead | null>(
    () => this.sites().find((s) => s.key === this.selectedSiteKey()) ?? null,
  );

  protected readonly listingLinkSelector = computed<string | null>(() => {
    const selectors = this.selectedSite()?.selectors as Record<string, unknown> | undefined;
    return (selectors?.['listing_link_selector'] as string | undefined) ?? null;
  });

  constructor() {
    // React to site_key form control changes (works with CVA SelectDropdownComponent)
    this.form.controls.site_key.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((key) => {
        this.selectedSiteKey.set(key);
        this.previewResult.set(null);
        this.previewError.set(false);
        const site = this.sites().find((s) => s.key === key);
        if (site) {
          this.form.patchValue({ start_url: site.base_url });
        }
      });
  }

  protected onStartUrlChange(): void {
    this.previewResult.set(null);
    this.previewError.set(false);
  }

  protected canPreview(): boolean {
    const url = this.form.controls.start_url.value.trim();
    return !!this.listingLinkSelector() && url.length > 0 && !this.previewLoading();
  }

  protected onPreviewListings(): void {
    const url = this.form.controls.start_url.value.trim();
    const selector = this.listingLinkSelector();
    if (!url || !selector) return;

    this.previewLoading.set(true);
    this.previewResult.set(null);
    this.previewError.set(false);

    this.sitesService
      .previewSelector(url, selector)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.previewResult.set(result);
          this.previewLoading.set(false);
        },
        error: () => {
          this.previewError.set(true);
          this.previewLoading.set(false);
        },
      });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const payload: JobCreate = {
      site_key: value.site_key,
      start_url: value.start_url.trim(),
      max_pages: value.max_pages > 0 ? value.max_pages : undefined,
    };

    this.jobsService
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.selectedSiteKey.set('');
          this.previewResult.set(null);
          this.form.reset({ site_key: '', start_url: '', max_pages: 10 });
          this.jobCreated.emit();
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Erro ao criar job';
          this.error.set(message);
          this.submitting.set(false);
        },
      });
  }
}