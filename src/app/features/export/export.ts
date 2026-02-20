import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ExportFormComponent } from './components/export-form/export-form';

@Component({
  selector: 'app-export',
  imports: [ExportFormComponent],
  templateUrl: './export.html',
  styleUrl: './export.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportComponent {}
