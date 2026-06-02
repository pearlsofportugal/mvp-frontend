import { PLATFORM_ID, ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import type { JobListRead, JobRead } from '../../../../core/api/model';
import { JobsService } from '../../../../core/services/jobs';
import { StatusBadge } from "../../../../shared/components/status-badge/status-badge";
import { ContextMenu } from "../../../../shared/components/context-menu/context-menu";
import { FormatDatePipe } from "../../../../shared/pipes/format-date-pipe";

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

@Component({
  selector: 'app-jobs-list',
  imports: [StatusBadge, ContextMenu, FormatDatePipe],
  templateUrl: './jobs-list.html',
  styleUrl: './jobs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobsService = inject(JobsService);
  private readonly platformId = inject(PLATFORM_ID);

  jobs = input.required<JobListRead[]>();
  /** Id do job atualmente aberto no detail — evita SSE duplicado com JobDetailComponent */
  selectedJobId = input<string | null>(null);
  view = output<JobListRead>();
  cancel = output<string>();
  delete = output<string>();

  // ── SSE live updates ─────────────────────────────────────────────────────
  private readonly liveUpdates = signal<Record<string, JobRead>>({});
  private readonly activeStreams = new Map<string, Subscription>();

  protected readonly liveJobs = computed<JobListRead[]>(() =>
    this.jobs().map(j => {
      const live = this.liveUpdates()[j.id];
      return live ? { ...j, ...live } : j;
    })
  );

  // ── Kebab menu state ────────────────────────────────────────────────────
  private readonly menuState = signal<{ id: string; top: number; right: number } | null>(null);
  protected readonly openMenuId = computed(() => this.menuState()?.id ?? null);
  protected readonly menuPos    = computed(() => ({ top: this.menuState()?.top ?? 0, right: this.menuState()?.right ?? 0 }));

  private scrollListener: (() => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.removeScrollListener();
      if (this.closeTimer !== null) clearTimeout(this.closeTimer);
      this.activeStreams.clear();
    });

    effect(() => {
      const currentJobs = this.jobs();
      const detailJobId = this.selectedJobId(); // lido para re-trigger quando muda
      // Não abrir stream para o job aberto no detail — ele faz streaming próprio
      const activeIds = new Set(
        currentJobs
          .filter(j => !TERMINAL_STATUSES.has(j.status) && j.id !== detailJobId)
          .map(j => j.id)
      );

      // Fechar streams de jobs terminados ou delegados ao detail
      for (const [id, sub] of this.activeStreams.entries()) {
        if (!activeIds.has(id)) {
          sub.unsubscribe();
          this.activeStreams.delete(id);
        }
      }

      // Abrir streams para novos jobs ativos (browser only)
      if (isPlatformBrowser(this.platformId)) {
        for (const job of currentJobs) {
          if (activeIds.has(job.id) && !this.activeStreams.has(job.id)) {
            this.startStream(job.id);
          }
        }
      }
    });
  }

  private startStream(jobId: string): void {
    const sub = this.jobsService
      .streamJobProgress(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Ensure id is always present — some SSE events may omit it
          const safe: JobRead = updated?.id ? updated : { ...updated, id: jobId };
          this.liveUpdates.update(m => ({ ...m, [jobId]: safe }));
          if (TERMINAL_STATUSES.has(safe.status)) {
            this.activeStreams.get(jobId)?.unsubscribe();
            this.activeStreams.delete(jobId);
          }
        },
        error: () => { this.activeStreams.delete(jobId); },
        complete: () => { this.activeStreams.delete(jobId); },
      });
    this.activeStreams.set(jobId, sub);
  }

  private closeMenu(): void {
    this.menuState.set(null);
    this.removeScrollListener();
  }

  private removeScrollListener(): void {
    if (this.scrollListener && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollListener, { capture: true });
      this.scrollListener = null;
    }
  }

  // ── Lógica de Cálculo do Progresso Inabalável ──────────────────────────
  protected getJobProgressPercentage(job: JobListRead): number {
    // Se o job já estiver terminado, força visualmente os 100%
    if (TERMINAL_STATUSES.has(job.status)) {
      return 100;
    }

    const progress = job.progress;
    if (!progress) return 0;

    // Adaptação caso o teu payload use max_pages dinâmico (ex: vindo da config do scraper)
    // Se não vier, assume o teu padrão que são 3 ou 10 páginas.
    const maxPages = (progress as any).max_pages ?? 3; 
    const pagesVisited = progress.pages_visited ?? 1;
    const found = progress.listings_found ?? 0;
    const saved = progress.listings_scraped ?? 0;
    const errors = (progress as any).errors ?? 0;

    // Itens processados = Guardados com sucesso + Itens que falharam
    const totalProcessedOnPage = saved + errors;

    if (maxPages <= 1) {
      if (found === 0) return 0;
      return Math.min(100, Math.round((totalProcessedOnPage / found) * 100));
    }

    // 1. Calcular a fatia fixa que as páginas anteriores já garantiram
    const progressFromPastPages = ((pagesVisited - 1) / maxPages) * 100;

    // 2. Calcular o avanço fino dentro da página atual
    let progressWithinCurrentPage = 0;
    if (found > 0) {
      progressWithinCurrentPage = (totalProcessedOnPage / found) * (100 / maxPages);
    }

    const finalPercentage = progressFromPastPages + progressWithinCurrentPage;

    // Retorna arredondado, garantindo que nunca passa dos 99% enquanto estiver 'running'
    const rounded = Math.round(finalPercentage);
    return Math.min(99, Math.max(0, rounded));
  }

  // ── Row actions ─────────────────────────────────────────────────────────
  protected onView(job: JobListRead): void {
    this.closeMenu();
    this.view.emit(job);
  }

  protected onCancel(id: string): void {
    this.closeMenu();
    this.cancel.emit(id);
  }

  protected onDelete(id: string): void {
    this.closeMenu();
    this.delete.emit(id);
  }
}
