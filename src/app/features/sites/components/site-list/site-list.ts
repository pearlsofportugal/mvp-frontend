import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { ConfidenceMeta, SiteConfigRead, SiteConfigScheduleInfo } from '../../../../core/api/model';
import { formatInterval, formatNextRun, formatRelativePast } from '../../../../core/utils/time.util';

@Component({
  selector: 'app-site-list',
  imports: [],
  templateUrl: './site-list.html',
  styleUrl: './site-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteListComponent {
  sites = input.required<SiteConfigRead[]>();
  scheduleInfoMap = input<Map<string, SiteConfigScheduleInfo>>(new Map());
  addSite = output<void>();
  edit = output<SiteConfigRead>();
  delete = output<string>();
  reactivate = output<string>();

  protected readonly pendingDeleteKey = signal<string | null>(null);

  protected onEdit(site: SiteConfigRead): void {
    this.edit.emit(site);
  }

  protected onReactivate(key: string): void {
    this.reactivate.emit(key);
  }

  protected onRequestDelete(key: string): void {
    this.pendingDeleteKey.set(key);
  }

  protected onConfirmDelete(key: string): void {
    this.pendingDeleteKey.set(null);
    this.delete.emit(key);
  }

  protected onCancelDelete(): void {
    this.pendingDeleteKey.set(null);
  }

  protected getSelectorCount(site: SiteConfigRead): number {
    if (!site.selectors || typeof site.selectors !== 'object') return 0;
    return Object.values(site.selectors as Record<string, unknown>).filter(Boolean).length;
  }

  protected getAverageConfidence(site: SiteConfigRead): number | null {
    const scores = site.confidence_scores;
    if (!scores || typeof scores !== 'object') return null;
    const values = Object.values(scores) as number[];
    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
  }

  protected getConfidenceClass(score: number): string {
    if (score >= 80) return 'conf-high';
    if (score >= 50) return 'conf-mid';
    return 'conf-low';
  }

  protected formatConfidenceMeta(meta: ConfidenceMeta): string {
    const ago = formatRelativePast(meta.updated_at);
    const n = meta.sample_count;
    return `Com base em ${n} ${n !== 1 ? 'anúncios' : 'anúncio'} · calculado ${ago}`;
  }

  protected getScheduleInfo(site: SiteConfigRead): SiteConfigScheduleInfo | null {
    return this.scheduleInfoMap().get(site.key) ?? null;
  }

  protected readonly formatInterval = formatInterval;
  protected readonly formatNextRun = formatNextRun;

  protected formatUpdatedAt(dateStr: string): string {
    return `Atualizado ${formatRelativePast(dateStr)}`;
  }
}
