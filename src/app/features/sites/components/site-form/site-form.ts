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

import { SitesService } from '../../../../core/services/sites.service';
import type {
  SiteConfigRead,
  SiteConfigCreate,
  SiteConfigSuggestResponse,
  SelectorValidationReport,
  SelectorValidationResult,
} from '../../../../core/api/model';
import {
  SelectorCategory,
  SELECTOR_CATEGORIES,
  SELECTOR_FIELDS,
  SelectorField,
  SUGGEST_FIELD_MAP,
  FIELD_LABELS
  
} from '../../selectors.schema';
import { SiteSuggestComponent, SelectorApplied } from '../site-suggest/site-suggest';
import { SitePreviewComponent } from '../site-preview/site-preview';

type ExtractionMode = 'section' | 'direct';
type PaginationType = 'html_next' | 'query_param' | 'incremental_path';
type FormTab = 'basic' | 'selectors' | 'advanced';
type FormStage = 'detect' | 'configure';


@Component({
  selector: 'app-site-form',
  imports: [ReactiveFormsModule, SiteSuggestComponent, SitePreviewComponent],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFormComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfigRead | null>(null);
  success = output<void>();
  cancel = output<void>();

  protected readonly submitting = signal(false);
  protected readonly activeTab = signal<FormTab>('basic');
  protected readonly showHelp = signal(false);
  protected readonly previewUrl = signal('');
  protected readonly formStage = signal<FormStage>('detect');
  protected readonly suggestLoading = signal(false);
  protected readonly suggestResult = signal<SiteConfigSuggestResponse | null>(null);
  protected readonly suggestError = signal(false);

  protected readonly validating = signal(false);
  protected readonly validationReport = signal<SelectorValidationReport | null>(null);

  protected readonly validationStatus = computed<'idle' | 'success' | 'warning' | 'error'>(() => {
    const r = this.validationReport();
    if (!r) return 'idle';
    if (!r.success) return 'error';
    if (r.warnings?.length) return 'warning';
    return 'success';
  });

  protected readonly validationResultMap = computed<Map<string, SelectorValidationResult>>(() => {
    const r = this.validationReport();
    if (!r) return new Map();
    return new Map(r.results.map((res) => [res.field, res]));
  });

  protected readonly canValidate = computed(() => {
    if (!this.site()) return false;
    return this.selectorFields.some((f) => !!this.form.get(f.key)?.value?.trim());
  });

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
    pagination_type: new FormControl<PaginationType | ''>('', { nonNullable: true }),
    pagination_param: new FormControl('', { nonNullable: true }),
    link_pattern: new FormControl('', { nonNullable: true }),
    image_filter: new FormControl('', { nonNullable: true }),
    ...this.buildSelectorControls(),
  });

  constructor() {
    effect(() => {
      const currentSite = this.site();
      if (currentSite) {
        this.formStage.set('configure');
        this.patchFormForEdit(currentSite);
      } else {
        this.formStage.set('detect');
        this.suggestResult.set(null);
        this.suggestError.set(false);
        this.resetFormForCreate();
      }
      this.validationReport.set(null);
    });
  }

  protected getSelectorsByCategory(category: SelectorCategory): SelectorField[] {
    return this.selectorFields.filter((f) => f.category === category);
  }

  protected getFieldValue(key: string): string {
    return (this.form.get(key)?.value as string) ?? '';
  }

  onSelectorApplied(event: SelectorApplied): void {
    const control = this.form.get(event.field);
    if (control) {
      control.setValue(event.selector);
      control.markAsDirty();
    }
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
    // Block save if validation ran and found errors
    const report = this.validationReport();
    if (report && !report.success) {
      this.activeTab.set('selectors');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab.set(this.resolveInvalidTab());
      return;
    }

    this.submitting.set(true);

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
        error: () => {
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

  protected showPaginationParam(): boolean {
    return this.form.controls.pagination_type.value === 'query_param';
  }

  protected canDetect(): boolean {
    return this.form.controls.base_url.value.trim().length > 0;
  }

  protected onDetect(): void {
    if (!this.canDetect()) return;
    this.suggestLoading.set(true);
    this.suggestResult.set(null);
    this.suggestError.set(false);
    this.sitesService
      .suggest(this.form.controls.base_url.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.suggestResult.set(r); this.suggestLoading.set(false); },
        error: () => { this.suggestLoading.set(false); this.suggestError.set(true); },
      });
  }

  protected onApplySuggestions(): void {
    const r = this.suggestResult();
    if (!r) return;
    for (const [apiKey, candidates] of Object.entries(r.candidates)) {
      if (!candidates.length) continue;
      const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));
      const fieldKey = SUGGEST_FIELD_MAP[apiKey];
      if (fieldKey) {
        const ctrl = this.form.get(fieldKey);
        if (ctrl) { ctrl.setValue(best.selector); ctrl.markAsDirty(); }
      }
    }
    this.formStage.set('configure');
    this.activeTab.set('selectors');
  }

  protected onSkipToManual(): void {
    this.formStage.set('configure');
    this.activeTab.set('basic');
  }

  protected onBackToDetect(): void {
    this.formStage.set('detect');
  }

  protected onValidateSelectors(): void {
    const siteKey = this.site()?.key;
    if (!siteKey) return;

    const selectors: Record<string, string> = {};
    for (const field of this.selectorFields) {
      const val = (this.form.get(field.key)?.value as string)?.trim();
      if (val) selectors[field.key] = val;
    }

    const url = this.previewUrl().trim() || undefined;

    this.validating.set(true);
    this.validationReport.set(null);

    this.sitesService
      .validateSelectors(siteKey, selectors, url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.validationReport.set(r);
          this.validating.set(false);
        },
        error: () => {
          this.validating.set(false);
        },
      });
  }

  protected getValidationResult(fieldKey: string): SelectorValidationResult | undefined {
    return this.validationResultMap().get(fieldKey);
  }

  protected isValError(fieldKey: string): boolean {
    const r = this.validationResultMap().get(fieldKey);
    return !!r && !r.valid_css;
  }

  protected isValWarning(fieldKey: string): boolean {
    const r = this.validationResultMap().get(fieldKey);
    return !!r && r.valid_css && r.matches === 0;
  }

  protected isValSuccess(fieldKey: string): boolean {
    const r = this.validationResultMap().get(fieldKey);
    return !!r && r.valid_css && r.matches > 0;
  }

  protected suggestCoverage(): number {
    const r = this.suggestResult();
    return r ? Object.values(r.candidates).filter((c) => c.length > 0).length : 0;
  }

  protected suggestPreviewGroups(): { label: string; sample: string; score: number }[] {
    const r = this.suggestResult();
    if (!r) return [];
    return Object.entries(r.candidates)
      .filter(([, c]) => c.length > 0)
      .map(([apiKey, candidates]) => {
        const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));
        return {
          label: FIELD_LABELS[apiKey] ?? apiKey.replace(/_/g, ' '),
          sample: best.sample,
          score: Math.round(best.score * 100),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  protected setPreviewUrl(event: Event): void {
    this.previewUrl.set((event.target as HTMLInputElement).value);
  }

  protected getFieldConfidence(fieldKey: string): number | null {
    const scores = this.site()?.confidence_scores;
    if (!scores) return null;
    const val = scores[fieldKey];
    return val != null ? Math.round(val * 100) : null;
  }

  protected confClass(score: number): string {
    if (score >= 80) return 'conf-high';
    if (score >= 50) return 'conf-mid';
    return 'conf-low';
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

  private patchFormForEdit(site: SiteConfigRead): void {
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
      pagination_type: (site.pagination_type as PaginationType | undefined) ?? '',
      pagination_param: site.pagination_param ?? '',
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
      pagination_type: '',
      pagination_param: '',
      link_pattern: '',
      image_filter: '',
    });
    this.form.controls.key.enable();
  }

  private buildPayload(): SiteConfigCreate {
    const raw = this.form.getRawValue() as Record<string, string> & {
      extraction_mode: ExtractionMode;
      pagination_type: PaginationType | '';
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
      pagination_type: raw.pagination_type || undefined,
      pagination_param: raw['pagination_param']?.trim() || undefined,
      selectors,
      link_pattern: raw['link_pattern'].trim() || undefined,
      image_filter: raw['image_filter'].trim() || undefined,
    };
  }
}
