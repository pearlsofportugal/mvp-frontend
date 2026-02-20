
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { interval, startWith, switchMap, catchError, of } from 'rxjs';
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
  imports: [JobFormComponent, JobsListComponent, JobDetailComponent],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsComponent {
  private readonly jobsService = inject(JobsService);
  private readonly sitesService = inject(SitesService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly actionError = signal<string | null>(null);
  protected readonly selectedJob = signal<ScrapeJob | null>(null);

  // FIX: jobs via polling direto com switchMap
  // Substituímos rxResource + reloadTick pelo padrão interval + switchMap,
  // que cancela automaticamente requests anteriores ainda em voo.
  protected readonly jobs = signal<ScrapeJob[]>([]);
  protected readonly jobsLoading = signal(false);
  protected readonly jobsError = signal<string | null>(null);

  // Sites — rxResource continua adequado (não tem polling)
  readonly sitesResource = rxResource<SiteConfig[], number>({
    params: () => 0,
    stream: () => this.sitesService.list(),
  });

  protected readonly sites = computed<SiteConfig[]>(
    () => (this.sitesResource.value() ?? []).filter((s) => s.is_active),
  );

  protected readonly loading = computed<boolean>(
    () => this.jobsLoading() || this.sitesResource.isLoading(),
  );

  protected readonly error = computed(() => {
    if (this.actionError()) return this.actionError();
    if (this.jobsError()) return this.jobsError();
    const sitesErr = this.sitesResource.error();
    if (sitesErr)
      return sitesErr instanceof Error ? sitesErr.message : 'Erro ao carregar sites';
    return null;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // FIX: switchMap garante que só existe um request em voo a cada momento.
      // Se o request anterior ainda não terminou quando o próximo tick chegar,
      // é cancelado automaticamente (unsubscribe do Observable HTTP anterior).
      interval(3000)
        .pipe(
          startWith(0),
          switchMap(() => {
            this.jobsLoading.set(true);
            return this.jobsService.getAll().pipe(
              catchError((err: unknown) => {
                this.jobsError.set(toErrorMessage(err, 'Erro ao carregar jobs'));
                return of(null); // não propagar o erro — manter o polling ativo
              }),
            );
          }),
          takeUntilDestroyed(), // cancela o intervalo quando o componente é destruído
        )
        .subscribe((result) => {
          this.jobsLoading.set(false);
          if (result !== null) {
            this.jobs.set(result);
            this.jobsError.set(null);
          }
        });
    }
  }

  onJobCreated(): void {
    // Não é preciso forçar reload — o próximo tick do interval apanha o novo job.
    // Mas podemos forçar imediatamente para feedback mais rápido.
    // Como agora não temos reloadTick, fazemos um request pontual:
    this.jobsService.getAll().subscribe({
      next: (jobs) => this.jobs.set(jobs),
      error: () => { }, // silencioso — o polling seguinte vai tentar de novo
    });
  }

  onViewJob(job: ScrapeJob): void {
    this.selectedJob.set(job);
  }


  onCancelJob(id: string): void {
    this.actionError.set(null);
    this.jobsService.cancel(id).subscribe({
      next: () => {
        this.jobsService.getAll().subscribe({ next: (j) => this.jobs.set(j) });
      },
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
        this.jobsService.getAll().subscribe({ next: (j) => this.jobs.set(j) });
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
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'error' in err) {
    return (err as { error?: { detail?: string } }).error?.detail ?? fallback;
  }
  return fallback;
}