import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import type { SiteConfigRead, JobCreate } from '../../../../core/api/model';

type JobFormGroup = FormGroup<{
  site_key: FormControl<string>;
  start_url: FormControl<string>;
  max_pages: FormControl<number>;
}>;

@Component({
  selector: 'app-job-form',
  imports: [ ReactiveFormsModule],
  templateUrl: './job-form.html',
  styleUrl: './job-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobFormComponent {
  private readonly jobsService = inject(JobsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sites = input.required<SiteConfigRead[]>();
  readonly jobCreated = output<void>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

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

  protected onSiteChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const site = this.sites().find((s) => s.key === select.value);
    if (!site) return;

    this.form.patchValue({ start_url: site.base_url });
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
          this.form.reset({
            site_key: '',
            start_url: '',
            max_pages: 10,
          });
          this.jobCreated.emit();
        },
        error: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Erro ao criar job';
          this.error.set(message);
          this.submitting.set(false);
          console.error('Erro ao criar job:', err);
        },
      });
  }
}