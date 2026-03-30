// src/app/features/jobs/components/job-detail/job-detail.ts
//
// MELHORIA: Quando o job recebido está a correr (status === 'running' | 'pending'),
// o componente abre automaticamente um stream SSE para receber atualizações em tempo real.
// O stream fecha sozinho quando o job termina.
//
// Quando o job já terminou (passed via input em estado terminal), mostra apenas
// o snapshot estático — sem stream.
//
// FALLBACK: botão "Atualizar" emite o evento (refresh) para o componente pai
// que pode chamar getById() manualmente, para cenários onde SSE não funciona.

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
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { JobRead } from '../../../../core/api/model';
import { JobsService } from '../../../../core/services/jobs';
import { StatusBadge } from "../../../../shared/components/status-badge/status-badge";

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

@Component({
  selector: 'app-job-detail',
  imports: [DatePipe, StatusBadge],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailComponent {
  private readonly jobsService = inject(JobsService);
  private readonly destroyRef = inject(DestroyRef);

  /** Job inicial passado pelo componente pai (pode ser snapshot desatualizado) */
  readonly job = input.required<JobRead>();
  readonly close = output<void>();
  /** Emitido quando o utilizador clica "Atualizar" (fallback para SSE) */
  readonly refresh = output<void>();

  /** Job em tempo real — atualizado pelo stream SSE enquanto está a correr */
  protected readonly liveJob = signal<JobRead | null>(null);
  protected readonly streaming = signal(false);
  protected readonly streamError = signal<string | null>(null);

  /** Job efetivo a mostrar na UI — liveJob se disponível, senão o input */
  protected readonly displayJob = computed(() => this.liveJob() ?? this.job());

  constructor() {
    // Quando o job input muda, decidir se deve abrir/fechar stream SSE
    effect(() => {
      const job = this.job();

      if (TERMINAL_STATUSES.has(job.status)) {
        // Job já terminou — usar snapshot estático, sem stream
        this.liveJob.set(null);
        this.streaming.set(false);
        return;
      }

      // Job está pending ou running — abrir stream SSE
      this.startStreaming(job.id);
    });
  }

  private startStreaming(jobId: string): void {
    if (this.streaming()) return; // já está a fazer stream deste job

    this.streaming.set(true);
    this.streamError.set(null);

    this.jobsService
      .streamJobProgress(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedJob) => {
          this.liveJob.set(updatedJob);
        },
        error: (err: unknown) => {
          this.streaming.set(false);
          const message = err instanceof Error ? err.message : 'Erro no stream de progresso';
          this.streamError.set(message);
          // Fallback automático: polling já está ativo no JobsComponent pai,
          // por isso o utilizador ainda verá atualizações (mais lentas)
        },
        complete: () => {
          this.streaming.set(false);
        },
      });
  }

  protected readonly progressPercentage = computed<number>(() => {
    const job = this.displayJob();
    const progress = job.progress;
    if (!progress) return 0;

    const pagesVisited = progress.pages_visited ?? 0;
    const listingsFound = progress.listings_found ?? 0;
    const listingsScraped = progress.listings_scraped ?? 0;

    if (listingsFound <= 0) {
      const maxPages = Math.max(1, job.max_pages ?? 10);
      return this.clamp(Math.round((pagesVisited / maxPages) * 30), 0, 30);
    }

    const scrapeRatio = listingsScraped / listingsFound;
    return this.clamp(Math.round(30 + scrapeRatio * 70), 30, 100);
  });

  protected readonly progressPhase = computed<string>(() => {
    const progress = this.displayJob().progress;
    if (!progress) return 'A iniciar...';

    if ((progress.listings_found ?? 0) <= 0) {
      return `A descobrir listings (${progress.pages_visited ?? 0} páginas)`;
    }
    return `A processar ${progress.listings_scraped ?? 0}/${progress.listings_found ?? 0} listings`;
  });

  protected onClose(): void {
    this.close.emit();
  }

  protected onRefresh(): void {
    this.refresh.emit();
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}