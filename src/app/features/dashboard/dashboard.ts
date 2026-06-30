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
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Spinner } from '../../shared/components/spinner/spinner';

type SortColumn =
  | 'total_listings'
  | 'site_name'
  | 'listings_updated_last_7_days'
  | 'avg_price'
  | 'enriched_count'
  | 'exported_to_imodigi_count'
  | 'last_listing_updated_at'
  | 'last_job_at';

@Component({
  selector: 'app-dashboard',
  imports: [FormatPricePipe, StatusBadge, Spinner],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly statsResource = rxResource({
    stream: () => this.dashboardService.partnerStats(),
  });

  readonly weeklyResource = rxResource({
    stream: () => this.dashboardService.weeklyStats(),
  });

  protected readonly sortColumn = signal<SortColumn>('total_listings');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');
  protected readonly filterQuery = signal('');

  protected readonly rawPartners = computed<PartnerStats[]>(
    () => this.statsResource.value()?.partners ?? [],
  );

  protected readonly partners = computed<PartnerStats[]>(() => {
  const rows = this.rawPartners();
  const col = this.sortColumn();
  const dir = this.sortDir() === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = this.getSortValue(a, col);
    const bv = this.getSortValue(b, col);
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
  });
});
private getSortValue(partner: PartnerStats, col: SortColumn): string | number {
  switch (col) {
    case 'site_name':
      return partner.site.name?.toLowerCase() ?? '';
    case 'total_listings':
      return partner.total_listings ?? 0;
    case 'listings_updated_last_7_days':
      return partner.listings_updated_last_7_days ?? 0;
    case 'avg_price':
      return partner.avg_price != null ? Number(partner.avg_price) : 0;
    case 'enriched_count':
      return partner.enriched_count ?? 0;
    case 'exported_to_imodigi_count':
      return partner.exported_to_imodigi_count ?? 0;
    case 'last_listing_updated_at':
      return partner.last_listing_updated_at ?? '';
    case 'last_job_at':
      return partner.last_job_at ?? '';
  }
}
  protected readonly filteredPartners = computed<PartnerStats[]>(() => {
    const q = this.filterQuery().toLowerCase().trim();
    return q
      ? this.partners().filter(
          (p) =>
            p.site.name.toLowerCase().includes(q) ||
            p.site.key.toLowerCase().includes(q),
        )
      : this.partners();
  });

  protected readonly totalPartners = computed<number>(
    () => this.statsResource.value()?.total_partners ?? 0,
  );

protected readonly loading = computed<boolean>(
  () => this.statsResource.isLoading() || this.weeklyResource.isLoading()
);
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

  // is_active vive agora em p.site.is_active — sem merge necessário
  protected readonly activeScrapers = computed<number>(() =>
    this.rawPartners().filter((p) => p.site.is_active).length,
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

  protected readonly donutDashLength = computed<number>(
    () => (this.globalEnrichmentPct() / 100) * 351.86,
  );

  // ── Chart ────────────────────────────────────────────────────────────────────

  protected readonly chartData = computed<number[]>(() => {
    const history = this.weeklyResource.value()?.history ?? [];
    if (history.length === 0) return [0, 0, 0, 0, 0, 0];
    return history.map((item) => item.listings_captured ?? 0);
  });

  protected readonly chartLabels = computed<string[]>(() => {
    const history = this.weeklyResource.value()?.history ?? [];
    if (history.length === 0) return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
    return history.map((item) => item.label);
  });

  private readonly svgWidth = 700;
  private readonly svgHeight = 160;

  protected readonly chartPoints = computed<{ x: number; y: number; value: number }[]>(() => {
    const data = this.chartData();
    const maxVal = Math.max(...data, 1);
    const totalPoints = data.length;
    return data.map((val, index) => {
      const x = totalPoints > 1 ? (index / (totalPoints - 1)) * this.svgWidth : 0;
      const usableHeight = this.svgHeight - 30;
      const y = this.svgHeight - 15 - (val / maxVal) * usableHeight;
      return { x, y, value: val };
    });
  });

  protected readonly chartLinePath = computed<string>(() =>
    this.chartPoints().reduce(
      (path, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${path} L ${pt.x},${pt.y}`),
      '',
    ),
  );

  protected readonly chartAreaPath = computed<string>(() => {
    const linePath = this.chartLinePath();
    if (!linePath) return '';
    return `${linePath} L ${this.svgWidth},${this.svgHeight} L 0,${this.svgHeight} Z`;
  });

  // ── Métodos Auxiliares ───────────────────────────────────────────────────────

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