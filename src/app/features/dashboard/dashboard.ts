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
  protected readonly filterQuery = signal('');

  protected readonly rawPartners = computed<PartnerStats[]>(
    () => this.statsResource.value()?.partners ?? [],
  );

  protected readonly partners = computed<PartnerStats[]>(() => {
    const rows = this.rawPartners();
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

  protected readonly filteredPartners = computed<PartnerStats[]>(() => {
    const q = this.filterQuery().toLowerCase().trim();
    return q
      ? this.partners().filter((p) => p.source_partner.toLowerCase().includes(q))
      : this.partners();
  });

  protected readonly totalPartners = computed<number>(
    () => this.statsResource.value()?.total_partners ?? 0,
  );

  protected readonly loading = computed<boolean>(() => this.statsResource.isLoading());

  // ── KPI Aggregates ───────────────────────────────────────────────────────────

  protected readonly totalListings = computed<number>(() =>
    this.rawPartners().reduce((s, p) => s + (p.total_listings ?? 0), 0),
  );

  protected readonly last7dListings = computed<number>(() =>
    this.rawPartners().reduce((s, p) => s + (p.listings_updated_last_7_days ?? 0), 0),
  );

  protected readonly globalEnrichmentPct = computed<number>(() => {
    const total = this.totalListings();
    const enriched = this.rawPartners().reduce((s, p) => s + (p.enriched_count ?? 0), 0);
    if (!total) return 0;
    return Math.round((enriched / total) * 100);
  });

  protected readonly activeScrapers = computed<number>(() =>
    this.rawPartners().filter((p) => p.last_job_status === 'completed').length,
  );

  protected readonly imodigiPct = computed<number>(() => {
    const total = this.totalListings();
    const imodigi = this.rawPartners().reduce(
      (s, p) => s + (p.exported_to_imodigi_count ?? 0),
      0,
    );
    if (!total) return 0;
    return Math.round((imodigi / total) * 100);
  });

  // r=56 → circumference = 2 * π * 56 ≈ 351.86
  protected readonly donutDashLength = computed<number>(
    () => (this.globalEnrichmentPct() / 100) * 351.86,
  );

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
    return `${Math.round((enriched / total) * 100)}%`;
  }
}
