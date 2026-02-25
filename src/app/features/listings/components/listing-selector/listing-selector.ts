import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';

import { RealEstateService } from '../../../../core/services/listings.service';
import {
  RealEstateListItem,
  RealEstateListItemExtended,
} from '../../../../core/models/listing.model';

export type SortOption = 'title' | 'price_asc' | 'price_desc';
export type FilterOption = 'all' | 'enriched' | 'not_enriched' | string;

const PAGE_SIZE = 20;

@Component({
  selector: 'app-listing-selector',
  imports: [SlicePipe, FormsModule],
  templateUrl: './listing-selector.html',
  styleUrl: './listing-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingSelector {
  private readonly realEstateService = inject(RealEstateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly openOnInit = input(false);

  // ── Inputs / Outputs ──────────────────────────────────────────
  readonly selectedId = model<string | null>(null);
  readonly listingConfirmed = output<RealEstateListItemExtended>();

  // ── Modal state ───────────────────────────────────────────────
  protected readonly isOpen = signal(false);

  // ── Search ────────────────────────────────────────────────────
  protected readonly searchQuery = signal('');
  private readonly search$ = new Subject<string>();
  protected readonly isSearching = signal(false);
  protected readonly searchResults = signal<RealEstateListItemExtended[]>([]);

  // ── Pagination ────────────────────────────────────────────────
  private readonly currentPage = signal(1);
  protected readonly isLoadingMore = signal(false);
  protected readonly hasMore = signal(false);
  // Active query for load-more requests (empty string = initial browse)
  private activeQuery = '';

  // ── Initial load flag ─────────────────────────────────────────
  private initialLoaded = false;

  // ── Filters & sort ────────────────────────────────────────────
  protected readonly activeFilter = signal<FilterOption>('all');
  protected readonly activeSort = signal<SortOption>('title');

  // ── Source pills — capped, expandable ────────────────────────
  private readonly MAX_VISIBLE_SOURCES = 4;
  protected readonly sourcePillsExpanded = signal(false);

  // ── Pending selection ─────────────────────────────────────────
  protected readonly pendingId = signal<string | null>(null);
  protected readonly pendingListing = computed(
    () => this.searchResults().find((l) => l.id === this.pendingId()) ?? null,
  );

  // ── Confirmed listing (shown on trigger button) ───────────────
  protected readonly confirmedListing = signal<RealEstateListItemExtended | null>(null);

  // ── Filtered + sorted list ────────────────────────────────────
  protected readonly displayList = computed(() => {
    let list = [...this.searchResults()];
    const filter = this.activeFilter();
    const sort = this.activeSort();

    if (filter === 'enriched') list = list.filter((l) => l.is_enriched === true);
    else if (filter === 'not_enriched') list = list.filter((l) => !l.is_enriched);
    else if (filter !== 'all') list = list.filter((l) => l.source_partner === filter);

    if (sort === 'price_asc')
      list.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0));
    else if (sort === 'price_desc')
      list.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0));
    else list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));

    return list;
  });

  protected readonly resultCount = computed(() => this.displayList().length);

  protected readonly allSourcePills = computed(() => {
    const sources = new Set(
      this.searchResults().map((l) => l.source_partner).filter(Boolean),
    );
    return Array.from(sources) as string[];
  });

  protected readonly visibleSourcePills = computed(() => {
    const all = this.allSourcePills();
    return this.sourcePillsExpanded() ? all : all.slice(0, this.MAX_VISIBLE_SOURCES);
  });

  protected readonly hiddenSourceCount = computed(() => {
    const total = this.allSourcePills().length;
    return total > this.MAX_VISIBLE_SOURCES ? total - this.MAX_VISIBLE_SOURCES : 0;
  });

  // ── Helpers ───────────────────────────────────────────────────
  protected formatPrice(
    amount: number | null | undefined,
    currency: string | null | undefined,
  ): string {
    if (amount == null) return '—';
    return `${currency ?? '€'} ${amount.toLocaleString('pt-PT')}`;
  }

  protected shortId(id: string): string {
    return id.slice(0, 8) + '…';
  }

  protected locationLabel(l: RealEstateListItem): string {
    return [l.county, l.district].filter(Boolean).join(', ') || '—';
  }

  protected typeLabel(l: RealEstateListItem): string {
    return [l.property_type, l.typology].filter(Boolean).join(' ') || '—';
  }

  protected titleInitial(title: string | null | undefined): string {
    return (title ?? '?').trim().charAt(0).toUpperCase();
  }

  // ── Initial load ──────────────────────────────────────────────
  private loadInitial(): void {
    if (this.initialLoaded) return;

    this.isSearching.set(true);
    this.activeQuery = '';
    this.currentPage.set(1);

    this.realEstateService
      .searchForSelector('', { page: 1, page_size: PAGE_SIZE })
      .pipe(
        catchError(() => of({ items: [] as RealEstateListItemExtended[], total: 0 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        const items = data.items ?? [];
        this.searchResults.set(items);
        this.hasMore.set(items.length === PAGE_SIZE);
        this.isSearching.set(false);
        this.initialLoaded = true;
      });
  }

  // ── Load more ─────────────────────────────────────────────────
  protected loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);

    this.realEstateService
      .searchForSelector(this.activeQuery, { page: nextPage, page_size: PAGE_SIZE })
      .pipe(
        catchError(() => of({ items: [] as RealEstateListItemExtended[], total: 0 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        const newItems = data.items ?? [];
        this.searchResults.update((existing) => [...existing, ...newItems]);
        this.hasMore.set(newItems.length === PAGE_SIZE);
        this.currentPage.set(nextPage);
        this.isLoadingMore.set(false);
      });
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  constructor() {
    this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 2) {
            this.initialLoaded = false;
            this.isSearching.set(false);
            return of(null);
          }

          this.isSearching.set(true);
          this.activeQuery = query;
          this.currentPage.set(1);

          return this.realEstateService
            .searchForSelector(query, { page: 1, page_size: PAGE_SIZE })
            .pipe(
              catchError(() => of({ items: [] as RealEstateListItemExtended[], total: 0 })),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        if (data === null) {
          this.loadInitial();
          return;
        }
        const items = data.items ?? [];
        this.searchResults.set(items);
        this.hasMore.set(items.length === PAGE_SIZE);
        this.isSearching.set(false);
      });

    effect(() => {
      if (this.isOpen()) {
        this.pendingId.set(this.selectedId());
      }
    });

    effect(() => {
      if (this.openOnInit()) {
        this.open();
      }
    });
  }

  // ── Modal ─────────────────────────────────────────────────────
  protected open(): void {
    this.isOpen.set(true);
    this.loadInitial();
  }

  protected close(): void {
    this.pendingId.set(null);
    this.isOpen.set(false);
  }

  protected confirm(): void {
    const listing = this.pendingListing();
    if (!listing) return;
    this.confirmedListing.set(listing);
    this.selectedId.set(listing.id);
    this.listingConfirmed.emit(listing);
    this.isOpen.set(false);
  }

  // ── Interactions ──────────────────────────────────────────────
  protected onSearch(query: string): void {
    this.searchQuery.set(query);
    this.search$.next(query);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.search$.next('');
  }

  protected selectPending(listing: RealEstateListItemExtended): void {
    this.pendingId.set(this.pendingId() === listing.id ? null : listing.id);
  }

  protected setFilter(filter: FilterOption): void {
    this.activeFilter.set(filter);
  }

  protected setSort(sort: SortOption): void {
    this.activeSort.set(sort);
  }

  protected toggleSourcePills(): void {
    this.sourcePillsExpanded.update((v) => !v);
  }

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.close();
  }
}