import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import type { JobListRead } from '../../../../core/api/model';
import { StatusBadge } from "../../../../shared/components/status-badge/status-badge";
import { ContextMenu } from "../../../../shared/components/context-menu/context-menu";
import { FormatDatePipe } from "../../../../shared/pipes/format-date-pipe";

@Component({
  selector: 'app-jobs-list',
  imports: [StatusBadge, ContextMenu, FormatDatePipe],
  templateUrl: './jobs-list.html',
  styleUrl: './jobs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListComponent {
  private readonly destroyRef = inject(DestroyRef);

  jobs = input.required<JobListRead[]>();
  view = output<JobListRead>();
  cancel = output<string>();
  delete = output<string>();

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
    });
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
