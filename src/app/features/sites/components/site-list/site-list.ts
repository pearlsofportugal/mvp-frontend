import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { ConfidenceMeta, SiteConfigRead, SiteConfigScheduleInfo } from '../../../../core/api/model';

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
    const ago = this.relativeTime(meta.updated_at);
    const n = meta.sample_count;
    return `Based on ${n} listing${n !== 1 ? 's' : ''} · calculated ${ago}`;
  }

  protected getScheduleInfo(site: SiteConfigRead): SiteConfigScheduleInfo | null {
    return this.scheduleInfoMap().get(site.key) ?? null;
  }

  protected formatInterval(minutes: number | null | undefined): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return hours === 1 ? 'every hour' : `every ${hours}h`;
    return `every ${hours}h ${rem}min`;
  }

  protected formatNextRun(isoStr: string | null | undefined): string {
    if (!isoStr) return 'soon';
    const date = new Date(isoStr);
    const diffMs = date.getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60_000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `in ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `in ${diffHours}h`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  }

  private relativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  protected formatUpdatedAt(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays}d ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)}w ago`;
    return 'Updated ' + date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
}
