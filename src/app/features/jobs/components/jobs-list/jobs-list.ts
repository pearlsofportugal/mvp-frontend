import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { JobListRead } from '../../../../core/api/model';

@Component({
  selector: 'app-jobs-list',
  imports: [],
  templateUrl: './jobs-list.html',
  styleUrl: './jobs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListComponent {
  jobs = input.required<JobListRead[]>();
  view = output<JobListRead>();
  cancel = output<string>();
  delete = output<string>();

  protected onView(job: JobListRead): void {
    this.view.emit(job);
  }

  protected onCancel(id: string): void {
    this.cancel.emit(id);
  }

  protected onDelete(id: string): void {
    this.delete.emit(id);
  }

  protected formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-PT');
  }

  protected getBadgeClass(status: string): string {
    return `badge badge-${status}`;
  }
}
