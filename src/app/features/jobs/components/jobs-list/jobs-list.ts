import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import type { JobListRead } from '../../../../core/api/model';

@Component({
  selector: 'app-jobs-list',
  imports: [],
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

  protected toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMenuId() === id) { this.closeMenu(); return; }
    const btn  = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.menuState.set({ id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
    this.removeScrollListener();
    this.scrollListener = () => this.closeMenu();
    window.addEventListener('scroll', this.scrollListener, { capture: true, passive: true });
  }

  protected closeMenuDelayed(): void {
    if (this.closeTimer !== null) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => { this.closeMenu(); this.closeTimer = null; }, 120);
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

  protected formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-PT');
  }

  protected getBadgeClass(status: string): string {
    return `badge badge-${status}`;
  }
}
