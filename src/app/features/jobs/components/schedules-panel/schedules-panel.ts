import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { SiteConfigRead } from '../../../../core/api/model';
import { AppDialogComponent } from '../../../../shared/components/dialog/dialog';
import { SiteScheduleFormComponent } from '../site-schedule-form/site-schedule-form';

@Component({
  selector: 'app-schedules-panel',
  imports: [AppDialogComponent, SiteScheduleFormComponent],
  templateUrl: './schedules-panel.html',
  styleUrl: './schedules-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesPanelComponent {
  sites = input.required<SiteConfigRead[]>();

  protected readonly editingSite = signal<SiteConfigRead | null>(null);

  /** Local copy of site data so the row updates immediately after save */
  protected readonly localSites = signal<SiteConfigRead[] | null>(null);

  protected readonly displaySites = computed<SiteConfigRead[]>(() =>
    this.localSites() ?? this.sites()
  );

  protected readonly scheduledCount = computed(
    () => this.displaySites().filter(s => s.schedule_enabled).length
  );

  protected openDialog(site: SiteConfigRead): void {
    this.editingSite.set(site);
  }

  protected closeDialog(): void {
    this.editingSite.set(null);
  }

  protected onSaved(updated: SiteConfigRead): void {
    // Merge updated site into local copy
    const current = this.localSites() ?? this.sites();
    this.localSites.set(
      current.map(s => (s.key === updated.key ? updated : s))
    );
    this.editingSite.set(null);
  }

  protected formatInterval(minutes: number | null | undefined): string {
    if (!minutes) return '';
    if (minutes < 60) return `every ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `every ${hours}h`;
    return `every ${hours}h ${rem}m`;
  }
}
