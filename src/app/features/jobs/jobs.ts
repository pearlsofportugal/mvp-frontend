
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY, timer } from 'rxjs';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { JobsService } from '../../core/services/jobs';
import { SitesService } from '../../core/services/sites.service';
import type { JobListRead, JobRead, SiteConfigRead } from '../../core/api/model';
import { JobFormComponent } from './components/job-form/job-form';
import { JobsListComponent } from './components/jobs-list/jobs-list';
import { JobDetailComponent } from './components/job-detail/job-detail';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Spinner } from "../../shared/components/spinner/spinner";
import { PollingService } from '../../core/services/polling-service';

@Component({
  selector: 'app-jobs',
  imports: [JobFormComponent, JobsListComponent, JobDetailComponent, ConfirmDialogComponent, Spinner],
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
    () => this.jobsResource.isLoading() || this.sitesResource.isLoading(),
  );

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
}