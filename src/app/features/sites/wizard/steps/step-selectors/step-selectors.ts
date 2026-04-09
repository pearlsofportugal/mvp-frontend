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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SitesService } from '../../../../../core/services/sites.service';
import type {
  SiteConfigRead,
  SelectorValidationReport,
  SelectorValidationResult,
} from '../../../../../core/api/model';
import {
  SelectorCategory,
  SELECTOR_CATEGORIES,
  SELECTOR_FIELDS,
  SelectorField,
  SUGGEST_FIELD_MAP,
  FIELD_LABELS,
} from '../../../selectors.schema';
import { SiteSuggestComponent, SelectorApplied } from '../../../components/site-suggest/site-suggest';
import { SitePreviewComponent } from '../../../components/site-preview/site-preview';

@Component({
  selector: 'app-step-selectors',
  imports: [ReactiveFormsModule, SiteSuggestComponent, SitePreviewComponent],
  templateUrl: './step-selectors.html',
  styleUrl: './step-selectors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepSelectorsComponent {
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  site = input<SiteConfigRead | null>(null);

  back = output<void>();
  skip = output<void>();
  next = output<void>();
  siteUpdated = output<SiteConfigRead>();

  protected readonly saving = signal(false);
  protected readonly validating = signal(false);
  protected readonly previewUrl = signal('');
  protected readonly validationReport = signal<SelectorValidationReport | null>(null);

  protected readonly isLocked = computed(() => !this.site());
  protected readonly siteKey = computed(() => this.site()?.key ?? '');
  protected readonly isEditMode = computed(() => !!this.site());

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

  protected readonly form = new FormGroup(this.buildSelectorControls());

  constructor() {
    effect(() => {
      const currentSite = this.site();
      if (currentSite) {
        const selectors = (currentSite.selectors as Record<string, string> | null) ?? {};
        const patch = this.selectorFields.reduce<Record<string, string>>((acc, field) => {
          acc[field.key] = selectors[field.key] ?? '';
          return acc;
        }, {});
        this.form.patchValue(patch);
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

  protected shouldShowCategory(category: { key: SelectorCategory; sectionModeOnly?: boolean }): boolean {
    return true; // no extraction_mode access here; show all
  }

  protected hasSelectorError(field: SelectorField): boolean {
    const control = this.form.get(field.key);
    return !!control && control.invalid && (control.touched || this.saving());
  }

  protected setPreviewUrl(event: Event): void {
    this.previewUrl.set((event.target as HTMLInputElement).value);
  }

  onSelectorApplied(event: SelectorApplied): void {
    const control = this.form.get(event.field);
    if (control) {
      control.setValue(event.selector);
      control.markAsDirty();
    }
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
        next: (r) => { this.validationReport.set(r); this.validating.set(false); },
        error: () => { this.validating.set(false); },
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

  protected onSave(): void {
    const siteKey = this.site()?.key;
    if (!siteKey) return;

    const selectors: Record<string, string> = {};
    for (const field of this.selectorFields) {
      const val = (this.form.get(field.key)?.value as string)?.trim();
      if (val) selectors[field.key] = val;
    }

    this.saving.set(true);
    this.sitesService
      .update(siteKey, { selectors })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.siteUpdated.emit(updated);
          this.next.emit();
        },
        error: () => { this.saving.set(false); },
      });
  }

  private buildSelectorControls(): Record<string, FormControl<string>> {
    return SELECTOR_FIELDS.reduce<Record<string, FormControl<string>>>((acc, field) => {
      const validators = field.required ? [Validators.required] : [];
      acc[field.key] = new FormControl('', { nonNullable: true, validators });
      return acc;
    }, {});
  }
}
