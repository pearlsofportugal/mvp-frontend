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
      const activeIds = new Set(
        currentJobs.filter(j => !TERMINAL_STATUSES.has(j.status)).map(j => j.id)
      );

      // Close streams for jobs no longer active
      for (const [id, sub] of this.activeStreams.entries()) {
        if (!activeIds.has(id)) {
          sub.unsubscribe();
          this.activeStreams.delete(id);
        }
      }

      // Open streams for new active jobs (browser only)
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
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, { capture: true });
      this.scrollListener = null;
    }
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
