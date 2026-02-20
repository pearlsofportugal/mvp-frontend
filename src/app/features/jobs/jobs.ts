import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { interval, startWith } from 'rxjs';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { JobsService } from '../../core/services/jobs';
import { SitesService } from '../../core/services/sites.service';
import { ScrapeJob } from '../../core/models/scrape-job.model';
import { SiteConfig } from '../../core/models/site-config.model';
import { JobFormComponent } from './components/job-form/job-form';
import { JobsListComponent } from './components/jobs-list/jobs-list';
import { JobDetailComponent } from './components/job-detail/job-detail';

@Component({
  selector: 'app-jobs',
  imports: [
    JobFormComponent,
    JobsListComponent,
    JobDetailComponent,
  ],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent {
  private readonly jobsService = inject(JobsService);
  private readonly sitesService = inject(SitesService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly jobsRefreshTick = signal(0);
  private readonly actionError = signal<string | null>(null);
  protected readonly selectedJob = signal<ScrapeJob | null>(null);

  
  readonly jobsResource = rxResource<ScrapeJob[], number>({
    params: () => this.jobsRefreshTick(),
    stream: () => this.jobsService.getAll(),
  });

  readonly sitesResource = rxResource<SiteConfig[], number>({
    params: () => 0,
    stream: () => this.sitesService.list(),
  });

  protected readonly jobs = computed<ScrapeJob[]>(
    () => this.jobsResource.value() ?? []
  );

  protected readonly sites = computed<SiteConfig[]>(
    () => (this.sitesResource.value() ?? []).filter((s) => s.is_active)
  );

  protected readonly loading = computed<boolean>(
    () => this.jobsResource.isLoading() || this.sitesResource.isLoading()
  );

  protected readonly error = computed(() => {
    if (this.actionError()) return this.actionError();
    const jobsErr = this.jobsResource.error();
    if (jobsErr)
      return jobsErr instanceof Error
        ? jobsErr.message
        : 'Erro ao carregar jobs';
    const sitesErr = this.sitesResource.error();
    if (sitesErr)
      return sitesErr instanceof Error
        ? sitesErr.message
        : 'Erro ao carregar sites';
    return null;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      interval(3000)
        .pipe(startWith(0), takeUntilDestroyed())
        .subscribe(() => this.reloadJobs());
    }
  }

  onJobCreated(): void {
    this.reloadJobs();
  }

  onViewJob(job: ScrapeJob): void {
    this.selectedJob.set(job);
  }


  onCancelJob(id: string): void {
    this.actionError.set(null);
    this.jobsService.cancel(id).subscribe({
      next: () => this.reloadJobs(),
      error: (err: unknown) => {
        this.actionError.set(toErrorMessage(err, 'Erro ao cancelar job'));
        console.error('Erro ao cancelar job:', err);
      },
    });
  }

  onDeleteJob(id: string): void {
    if (!confirm('Apagar este job?')) return;
    this.actionError.set(null);
    this.jobsService.remove(id).subscribe({
      next: () => {
        if (this.selectedJob()?.id === id) this.selectedJob.set(null);
        this.reloadJobs();
      },
      error: (err: unknown) => {
        this.actionError.set(toErrorMessage(err, 'Erro ao apagar job'));
        console.error('Erro ao apagar job:', err);
      },
    });
  }


  onCloseDetail(): void {
    this.selectedJob.set(null);
  }

  reloadJobs(): void {
    this.jobsRefreshTick.update((tick) => tick + 1);
  }
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'error' in err) {
    return (err as { error?: { detail?: string } }).error?.detail ?? fallback;
  }
  return fallback;
}