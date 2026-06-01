import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';

import { JobsService } from '../../core/services/jobs';
import { SitesService } from '../../core/services/sites.service';

import type { JobListRead, JobRead, SiteConfigRead } from '../../core/api/model';
import { JobFormComponent } from './components/job-form/job-form';
import { JobsListComponent } from './components/jobs-list/jobs-list';
import { JobDetailComponent } from './components/job-detail/job-detail';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { AppDialogComponent } from '../../shared/components/dialog/dialog';
import { Spinner } from '../../shared/components/spinner/spinner';
import { SchedulesPanelComponent } from './components/schedules-panel/schedules-panel';

type JobsTab = 'jobs' | 'schedules';

@Component({
  selector: 'app-jobs',
  imports: [
    JobFormComponent,
    JobsListComponent,
    JobDetailComponent,
    ConfirmDialogComponent,
    AppDialogComponent,
    Spinner,
    SchedulesPanelComponent,
  ],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent {
  private readonly jobsService         = inject(JobsService);
  private readonly sitesService        = inject(SitesService);
  private readonly destroyRef          = inject(DestroyRef);
  private readonly router              = inject(Router);
  private readonly route               = inject(ActivatedRoute);


  readonly jobsResource  = rxResource({ stream: () => this.jobsService.getAll() });
  readonly sitesResource = rxResource<SiteConfigRead[], void>({ stream: () => this.sitesService.list() });

  protected readonly activeTab              = signal<JobsTab>('jobs');
  protected readonly selectedJob            = signal<JobRead | null>(null);
  protected readonly confirmingDeleteJobId  = signal<string | null>(null);
  protected readonly confirmingCancelJobId  = signal<string | null>(null);
  protected readonly showJobForm            = signal(false);

  constructor() {
    this.restoreJobFromUrl();
  }

  protected readonly jobs = computed<JobListRead[]>(
    () => this.jobsResource.value() ?? [],
  );

  protected readonly sites = computed<SiteConfigRead[]>(
    () => (this.sitesResource.value() ?? []).filter((s) => s.is_active),
  );

  protected readonly initialLoading = computed<boolean>(
    () =>
      (this.jobsResource.isLoading()  && this.jobsResource.value()  === undefined) ||
      (this.sitesResource.isLoading() && this.sitesResource.value() === undefined),
  );

  protected readonly refreshing = computed<boolean>(
    () =>
      (this.jobsResource.isLoading()  && this.jobsResource.value()  !== undefined) ||
      (this.sitesResource.isLoading() && this.sitesResource.value() !== undefined),
  );

  protected readonly jobStats = computed(() => {
    const list = this.jobs();
    return {
      total:     list.length,
      running:   list.filter((j) => j.status === 'running'   || j.status === 'pending').length,
      completed: list.filter((j) => j.status === 'completed').length,
      failed:    list.filter((j) => j.status === 'failed'    || j.status === 'cancelled').length,
    };
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────
  onJobCreated(): void {
    this.jobsResource.reload();
    this.showJobForm.set(false);
  }

  onViewJob(job: JobListRead): void {
    this.loadJobDetail(job.id);
  }

  onRefreshJobDetail(): void {
    const job = this.selectedJob();
    if (job) this.loadJobDetail(job.id);
  }

  onCloseDetail(): void {
    this.selectedJob.set(null);
    this.syncUrlToJob(null);
  }

  onCancelJob(id: string): void {
    this.confirmingCancelJobId.set(id);
  }

  onConfirmCancelJob(): void {
    const id = this.confirmingCancelJobId();
    if (!id) return;
    this.confirmingCancelJobId.set(null);

    this.jobsService.cancel(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => this.jobsResource.reload(),
        error: (err) => this.handleError(err, 'Não foi possível cancelar o job.'),
      });
  }

  onDeleteJob(id: string): void {
    this.confirmingDeleteJobId.set(id);
  }

  onConfirmDeleteJob(): void {
    const id = this.confirmingDeleteJobId();
    if (!id) return;
    this.confirmingDeleteJobId.set(null);

    this.jobsService.remove(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.selectedJob()?.id === id) {
            this.selectedJob.set(null);
            this.syncUrlToJob(null);
          }
          this.jobsResource.reload();
        },
        error: (err) => this.handleError(err, 'Não foi possível eliminar o job.'),
      });
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  /**
   * Carrega o detalhe de um job e sincroniza o URL.
   * Ponto único — elimina duplicação entre onViewJob e onRefreshJobDetail.
   */
  private loadJobDetail(id: string): void {
    this.jobsService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (full) => {
          this.selectedJob.set(full);
          this.syncUrlToJob(full);
        },
        error: (err) => this.handleError(err, 'Não foi possível carregar o detalhe do job.'),
      });
  }

  /**
   * Ao iniciar, lê ?jobId= do URL e carrega o job correspondente.
   * switchMap garante que só o último valor importa (sem nested subscribes).
   */
  private restoreJobFromUrl(): void {
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef),
      map((params) => params['jobId'] as string | undefined),
      filter((jobId): jobId is string => !!jobId && !this.selectedJob()),
      switchMap((jobId) => this.jobsService.getById(jobId)),
    ).subscribe({
      next:  (full) => this.selectedJob.set(full),
      error: (err)  => this.handleError(err, 'Não foi possível restaurar o job da URL.'),
    });
  }

  /**
   * Sincroniza o URL com o job selecionado.
   * Separado do effect() — chamado explicitamente nos handlers certos.
   */
  private syncUrlToJob(job: JobRead | null): void {
    this.router.navigate([], {
      relativeTo:          this.route,
      queryParams:         job ? { jobId: job.id } : {},
      queryParamsHandling: job ? 'merge' : '',
      replaceUrl:          true,
    });
  }

  /** Centraliza o tratamento de erros: log consistente num único ponto. */
  private handleError(err: unknown, message: string): void {
    console.error('[JobsComponent]', message, err);
  }
}