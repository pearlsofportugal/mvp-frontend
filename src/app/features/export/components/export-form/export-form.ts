import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ExportService,
  ExportFilters,
} from '../../../../core/services/export.service';
type ExportFormGroup = FormGroup<{
  district: FormControl<string>;
  county: FormControl<string>;
  property_type: FormControl<string>;
  source_partner: FormControl<string>;
  price_min: FormControl<string>;
  price_max: FormControl<string>;
}>;
@Component({
  selector: 'app-export-form',
  imports: [ReactiveFormsModule],
  templateUrl: './export-form.html',
  styleUrl: './export-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFormComponent {
  private readonly exportService = inject(ExportService);
  private readonly fb = inject(FormBuilder);

form: ExportFormGroup = new FormGroup({
  district: new FormControl('', { nonNullable: true }),
  county: new FormControl('', { nonNullable: true }),
  property_type: new FormControl('', { nonNullable: true }),
  source_partner: new FormControl('', { nonNullable: true }),
  price_min: new FormControl('', { nonNullable: true }),
  price_max: new FormControl('', { nonNullable: true }),
});

  exportData(format: 'csv' | 'json' | 'excel'): void {
    const filters: ExportFilters = {
      district: this.form.value.district || undefined,
      county: this.form.value.county || undefined,
      property_type: this.form.value.property_type || undefined,
      source_partner: this.form.value.source_partner || undefined,
      price_min:
        this.form.value.price_min !== ''
          ? Number(this.form.value.price_min)
          : undefined,
      price_max:
        this.form.value.price_max !== ''
          ? Number(this.form.value.price_max)
          : undefined,
    };

    this.exportService.download(format, filters);
  }
}
