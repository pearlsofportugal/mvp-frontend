import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { ListingsFiltersComponent } from './components/listings-filters/listings-filters';
import { ListingsTableComponent } from './components/listings-table/listings-table';
import { ListingDetailComponent } from './components/listing-detail/listing-detail';
import { ListingsStatsComponent } from './components/listings-stats/listings-stats';
import { RealEstateService } from '../../core/services/listings.service';
import { RealEstateFilters } from '../../core/models/listing.model';
import type { ApiResponsePaginatedResponse, ListingListRead, ListingRead } from '../../core/api/model';

@Component({
  selector: 'app-listings',
  imports: [
    ListingsFiltersComponent,
    ListingsTableComponent,
    ListingDetailComponent,
    ListingsStatsComponent,
  ],
  templateUrl: './listings.html',
  styleUrl: './listings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsComponent {
  private readonly realEstateService = inject(RealEstateService);

  // State
  private readonly selectedListingId = signal<string | null>(null);
  protected readonly showStats = signal(false);
  protected readonly currentFilters = signal<RealEstateFilters>({
    page: 1,
    page_size: 20,
  });

  // Resources (automatic lifecycle � no manual subscribe for reads)
  readonly realEstatesResource = rxResource<ApiResponsePaginatedResponse, RealEstateFilters>({
    params: () => this.currentFilters(),
    stream: ({ params }) => this.realEstateService.getListings(params),
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

  // Pagination derived
  protected readonly totalListings = computed(() => this.paginationData()?.meta?.total ?? 0);
  protected readonly currentPage = computed(() => this.paginationData()?.meta?.page ?? 1);
  protected readonly totalPages = computed(() => this.paginationData()?.meta?.pages ?? 1);
  protected readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());
  protected readonly hasPrevPage = computed(() => this.currentPage() > 1);

  // Filter actions
  onFiltersChange(filters: RealEstateFilters): void {
    this.currentFilters.set({ ...filters, page: 1, page_size: 20 });
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
    if (!confirm('Tem a certeza que deseja apagar este real estate?')) return;

    this.realEstateService.deleteListing(id).subscribe({
      next: () => {
        if (this.selectedListingId() === id) this.selectedListingId.set(null);
        this.realEstatesResource.reload();
      },
      error: (err) => console.error('Error deleting real estate:', err),
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
    this.currentFilters.update((filters) => ({ ...filters, page }));
  }
}
