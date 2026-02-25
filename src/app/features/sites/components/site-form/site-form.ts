import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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

import { SitesService } from '../../../../core/services/sites.service';
import {
  SiteConfig,
  SiteConfigCreate,
} from '../../../../core/models/site-config.model';
import {
  SelectorCategory,
  SELECTOR_CATEGORIES,
  SELECTOR_FIELDS,
  SelectorField,
} from '../../selectors.schema';

type ExtractionMode = 'section' | 'direct';
type FormTab = 'basic' | 'selectors' | 'advanced';

@Component({
  selector: 'app-site-form',
  imports: [ReactiveFormsModule],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFormComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfig | null>(null);
  success = output<void>();
  cancel = output<void>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<FormTab>('basic');
  protected readonly showHelp = signal(false);

  protected readonly selectorFields = SELECTOR_FIELDS;
  protected readonly selectorCategories = SELECTOR_CATEGORIES;

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
    link_pattern: new FormControl('', { nonNullable: true }),
    image_filter: new FormControl('', { nonNullable: true }),
    ...this.buildSelectorControls(),
  });

  constructor() {
    effect(() => {
      const currentSite = this.site();
      if (currentSite) {
        this.patchFormForEdit(currentSite);
      } else {
        this.resetFormForCreate();
      }
    });
  }

  protected getSelectorsByCategory(category: SelectorCategory): SelectorField[] {
    return this.selectorFields.filter((f) => f.category === category);
  }

  protected shouldShowCategory(category: { key: SelectorCategory; sectionModeOnly?: boolean }): boolean {
    if (!category.sectionModeOnly) return true;
    return this.form.controls.extraction_mode.value === 'section';
  }

  protected hasSelectorError(field: SelectorField): boolean {
    const control = this.form.get(field.key);
    return !!control && control.invalid && (control.touched || this.submitting());
  }

  protected setTab(tab: FormTab): void {
    this.activeTab.set(tab);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab.set(this.resolveInvalidTab());
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const payload = this.buildPayload();
    const currentSite = this.site();

    const request$ = currentSite
      ? this.sitesService.update(currentSite.key, payload)
      : this.sitesService.create(payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.emit();
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Erro ao guardar site';
          this.error.set(message);
          this.submitting.set(false);
        },
      });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected toggleHelp(): void {
    this.showHelp.update((v) => !v);
  }

  private buildSelectorControls(): Record<string, FormControl<string>> {
    return this.selectorFields.reduce<Record<string, FormControl<string>>>((acc, field) => {
      const validators = field.required ? [Validators.required] : [];
      acc[field.key] = new FormControl('', { nonNullable: true, validators });
      return acc;
    }, {});
  }

  private resolveInvalidTab(): FormTab {
    if (this.form.controls.key.invalid || this.form.controls.name.invalid || this.form.controls.base_url.invalid || this.form.controls.extraction_mode.invalid) {
      return 'basic';
    }

    if (this.selectorFields.some((field) => this.form.get(field.key)?.invalid)) {
      return 'selectors';
    }

    return 'advanced';
  }

  private patchFormForEdit(site: SiteConfig): void {
    const selectors = (site.selectors as Record<string, string> | null) ?? {};
    const selectorPatch = this.selectorFields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = selectors[field.key] ?? '';
      return acc;
    }, {});

    this.form.patchValue({
      key: site.key,
      name: site.name,
      base_url: site.base_url,
      extraction_mode: (site.extraction_mode as ExtractionMode | undefined) ?? 'direct',
      link_pattern: site.link_pattern ?? '',
      image_filter: site.image_filter ?? '',
      ...selectorPatch,
    });

    this.form.controls.key.disable();
  }

  private resetFormForCreate(): void {
    this.form.reset({
      key: '',
      name: '',
      base_url: '',
      extraction_mode: 'direct',
      link_pattern: '',
      image_filter: '',
    });
    this.form.controls.key.enable();
  }

  private buildPayload(): SiteConfigCreate {
    const raw = this.form.getRawValue() as Record<string, string> & {
      extraction_mode: ExtractionMode;
    };

    const selectors = this.selectorFields.reduce<Record<string, string>>((acc, field) => {
      const value = raw[field.key]?.trim();
      if (value) acc[field.key] = value;
      return acc;
    }, {});

    return {
      key: raw['key'].trim(),
      name: raw['name'].trim(),
      base_url: raw['base_url'].trim(),
      extraction_mode: raw.extraction_mode,
      selectors,
      link_pattern: raw['link_pattern'].trim() || undefined,
      image_filter: raw['image_filter'].trim() || undefined,
    };
  }
}
