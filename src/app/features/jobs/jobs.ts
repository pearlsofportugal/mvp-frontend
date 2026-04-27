
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { JobsService } from '../../core/services/jobs';
import { SitesService } from '../../core/services/sites.service';
import type { JobListRead, JobRead, SiteConfigRead } from '../../core/api/model';
import { JobFormComponent } from './components/job-form/job-form';
import { JobsListComponent } from './components/jobs-list/jobs-list';
import { JobDetailComponent } from './components/job-detail/job-detail';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { AppDialogComponent } from '../../shared/components/dialog/dialog';
import { Spinner } from "../../shared/components/spinner/spinner";
import { PollingService } from '../../core/services/polling-service';
import { SchedulesPanelComponent } from './components/schedules-panel/schedules-panel';

type JobsTab = 'jobs' | 'schedules';

@Component({
  selector: 'app-jobs',
  imports: [JobFormComponent, JobsListComponent, JobDetailComponent, ConfirmDialogComponent, AppDialogComponent, Spinner, SchedulesPanelComponent],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent {
  private readonly jobsService = inject(JobsService);
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pollingService = inject(PollingService)


  readonly jobsResource = rxResource({
    params: () => this.pollingService.tick(),
    stream: () => this.jobsService.getAll(),
  });

  readonly sitesResource = rxResource<SiteConfigRead[], number>({
    params: () => 0,
    stream: () => this.sitesService.list(),
  });

  protected readonly activeTab = signal<JobsTab>('jobs');
  protected readonly selectedJob = signal<JobRead | null>(null);
  protected readonly confirmingDeleteJobId = signal<string | null>(null);
  protected readonly confirmingCancelJobId = signal<string | null>(null);

  protected readonly jobs = computed<JobListRead[]>(
    () => this.jobsResource.value() ?? [],
  );

  protected readonly sites = computed<SiteConfigRead[]>(
    () => (this.sitesResource.value() ?? []).filter((s) => s.is_active),
  );

  protected readonly loading = computed<boolean>(
    () =>
      (this.jobsResource.isLoading() && this.jobsResource.value() === undefined) ||
      (this.sitesResource.isLoading() && this.sitesResource.value() === undefined),
  );

  protected readonly jobStats = computed(() => {
    const list = this.jobs();
    return {
      total: list.length,
      running: list.filter(j => j.status === 'running' || j.status === 'pending').length,
      completed: list.filter(j => j.status === 'completed').length,
      failed: list.filter(j => j.status === 'failed' || j.status === 'cancelled').length,
    };
  });

  onJobCreated(): void {
    this.jobsResource.reload();
  }

  onCancelJob(id: string): void {
    this.confirmingCancelJobId.set(id);
  }

  onConfirmCancelJob(): void {
    const id = this.confirmingCancelJobId();
    if (!id) return;
    this.confirmingCancelJobId.set(null);
    this.jobsService.cancel(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.jobsResource.reload(),
      error: () => {},
    });
  }

  onViewJob(job: JobListRead): void {
    this.jobsService.getById(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (full) => this.selectedJob.set(full),
      error: () => {},
    });
  }

  onDeleteJob(id: string): void {
    this.confirmingDeleteJobId.set(id);
  }

  onConfirmDeleteJob(): void {
    const id = this.confirmingDeleteJobId();
    if (!id) return;
    this.confirmingDeleteJobId.set(null);
    this.jobsService.remove(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (this.selectedJob()?.id === id) this.selectedJob.set(null);
        this.jobsResource.reload();
      },
      error: () => {},
    });
  }

  onCloseDetail(): void {
    this.selectedJob.set(null);
  }

  onRefreshJobDetail(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.jobsService.getById(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (full) => this.selectedJob.set(full),
      error: () => {},
    });
  }
}