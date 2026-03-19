import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { ListingsFiltersComponent } from './components/listings-filters/listings-filters';
import { ListingsTableComponent } from './components/listings-table/listings-table';
import { ListingDetailComponent } from './components/listing-detail/listing-detail';
import { ListingsStatsComponent } from './components/listings-stats/listings-stats';
import { RealEstateService } from '../../core/services/listings.service';
import { SitesService } from '../../core/services/sites.service';
import { RealEstateFilters } from '../../core/models/listing.model';
import type { ApiResponsePaginatedResponse, ListingListRead, ListingRead, SiteConfigRead } from '../../core/api/model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-listings',
  imports: [
    ListingsFiltersComponent,
    ListingsTableComponent,
    ListingDetailComponent,
    ListingsStatsComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './listings.html',
  styleUrl: './listings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsComponent {
  private readonly realEstateService = inject(RealEstateService);
  private readonly sitesService = inject(SitesService);
  private readonly destroyRef = inject(DestroyRef);

  // State
  private readonly selectedListingId = signal<string | null>(null);
  protected readonly showStats = signal(false);
  protected readonly confirmingDeleteListingId = signal<string | null>(null);
  protected readonly userFilters = signal<RealEstateFilters>({ page: 1, page_size: 20 });
  protected readonly sortField = signal<string | null>(null);
  protected readonly sortOrder = signal<'asc' | 'desc'>('asc');

  // Effective filters = user filters + sort
  private readonly currentFilters = computed<RealEstateFilters>(() => {
    const f = this.userFilters();
    const sf = this.sortField();
    return sf ? { ...f, sort_by: sf, sort_order: this.sortOrder() } : f;
  });

  // Resources (automatic lifecycle � no manual subscribe for reads)
  readonly realEstatesResource = rxResource<ApiResponsePaginatedResponse, RealEstateFilters>({
    params: () => this.currentFilters(),
    stream: ({ params }) => this.realEstateService.getListings(params),
  });
  readonly sitesResource = rxResource<SiteConfigRead[], number>({
    params: () => 0,
    stream: () => this.sitesService.list(),
  });
  readonly detailResource = rxResource<ListingRead | null, string | null>({
    params: () => this.selectedListingId(),
    stream: ({ params }) =>
      params ? this.realEstateService.getListingById(params) : of(null),
  });

  // Derived state
  protected readonly realEstates = computed(() => this.realEstatesResource.value()?.data?.items ?? []);
  protected readonly isLoadingListings = computed(() => this.realEstatesResource.isLoading());
  protected readonly paginationData = computed(() => this.realEstatesResource.value());
  protected readonly selectedRealEstate = computed(() => this.detailResource.value() ?? null);
  protected readonly isLoadingDetail = computed(() => this.detailResource.isLoading());
  protected readonly activeSites = computed<SiteConfigRead[]>(
    () => (this.sitesResource.value() ?? []).filter((s) => s.is_active),
  );

  // Pagination derived
  protected readonly totalListings = computed(() => this.paginationData()?.meta?.total ?? 0);
  protected readonly currentPage = computed(() => this.paginationData()?.meta?.page ?? 1);
  protected readonly totalPages = computed(() => this.paginationData()?.meta?.pages ?? 1);
  protected readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());
  protected readonly hasPrevPage = computed(() => this.currentPage() > 1);

  // Filter actions
  onFiltersChange(filters: RealEstateFilters): void {
    this.userFilters.set({ ...filters, page: 1, page_size: 20 });
  }

  onSort(field: string, order: 'asc' | 'desc'): void {
    this.sortField.set(field);
    this.sortOrder.set(order);
    this.userFilters.update((f) => ({ ...f, page: 1 }));
  }

  // Pagination actions
  onNextPage(): void {
    if (!this.hasNextPage()) return;
    this.updatePage(this.currentPage() + 1);
  }

  onPrevPage(): void {
    if (!this.hasPrevPage()) return;
    this.updatePage(this.currentPage() - 1);
  }

  // Listing actions
  onViewRealEstate(realEstate: ListingListRead): void {
    this.selectedListingId.set(realEstate.id);
  }

  onDeleteRealEstate(id: string): void {
    this.confirmingDeleteListingId.set(id);
  }

  onConfirmDeleteListing(): void {
    const id = this.confirmingDeleteListingId();
    if (!id) return;
    this.confirmingDeleteListingId.set(null);
    this.realEstateService.deleteListing(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (this.selectedListingId() === id) this.selectedListingId.set(null);
        this.realEstatesResource.reload();
      },
      error: () => {},
    });
  }

  // Modal actions
  onCloseDetail(): void {
    this.selectedListingId.set(null);
  }

  onViewStatsRequest(): void {
    this.showStats.set(true);
  }

  onCloseStats(): void {
    this.showStats.set(false);
  }

  private updatePage(page: number): void {
    this.userFilters.update((filters) => ({ ...filters, page }));
  }
}
