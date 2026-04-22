import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { DashboardService } from '../../core/services/dashboard.service';
import type { PartnerStats } from '../../core/api/model';
import { FormatPricePipe } from '../../shared/pipes/format-price-pipe';
import { FormatDatePipe } from '../../shared/pipes/format-date-pipe';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Spinner } from '../../shared/components/spinner/spinner';

type SortColumn =
  | 'source_partner'
  | 'total_listings'
  | 'listings_updated_last_7_days'
  | 'avg_price'
  | 'enriched_count'
  | 'exported_to_imodigi_count'
  | 'last_listing_updated_at'
  | 'last_job_at';

@Component({
  selector: 'app-dashboard',
  imports: [FormatPricePipe, FormatDatePipe, StatusBadge, Spinner],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly statsResource = rxResource({
    stream: () => this.dashboardService.partnerStats(),
  });

  protected readonly sortColumn = signal<SortColumn>('source_partner');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  protected readonly partners = computed<PartnerStats[]>(() => {
    const rows = this.statsResource.value()?.partners ?? [];
    const col = this.sortColumn();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  });

  protected readonly totalPartners = computed<number>(
    () => this.statsResource.value()?.total_partners ?? 0,
  );

  protected readonly loading = computed<boolean>(() => this.statsResource.isLoading());

  sort(col: SortColumn): void {
    if (this.sortColumn() === col) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(col);
      this.sortDir.set('asc');
    }
  }

  sortIcon(col: SortColumn): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  enrichmentRate(partner: PartnerStats): string {
    const total = partner.total_listings ?? 0;
    const enriched = partner.enriched_count ?? 0;
    if (!total) return '—';
    return `${Math.round((enriched / total) * 100)} %`;
  }
}
