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
import {
  Subject,
  merge,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';

import { RealEstateService } from '../../../../core/services/listings.service';
import type { ListingSearchItem } from '../../../../core/api/model';
import { Spinner } from "../../../../shared/components/spinner/spinner";
import { FormatPricePipe } from "../../../../shared/pipes/format-price-pipe";

export type SortOption = 'title' | 'price_asc' | 'price_desc';
export type FilterOption = 'all' | 'enriched' | 'not_enriched' | string;

const PAGE_SIZE = 20;

@Component({
  selector: 'app-listing-selector',
  imports: [SlicePipe, Spinner, FormatPricePipe],
  templateUrl: './listing-selector.html',
  styleUrl: './listing-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingSelectorComponent {
  private readonly realEstateService = inject(RealEstateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly openOnInit = input(false);
  readonly multiMode = input(false);

  // ── Inputs / Outputs ──────────────────────────────────────────
  readonly selectedId = model<string | null>(null);
  readonly listingConfirmed = output<ListingSearchItem>();
  readonly listingsConfirmed = output<ListingSearchItem[]>();

  // ── Modal state ───────────────────────────────────────────────
  protected readonly isOpen = signal(false);

  // ── Multi-select ─────────────────────────────────────────────
  protected readonly selectedItemIds = signal<string[]>([]);
  protected readonly selectedItemsList = computed(() =>
    this.searchResults().filter((l) => this.selectedItemIds().includes(l.id)),
  );
  protected readonly selectedCount = computed(() => this.selectedItemIds().length);

  // ── Search ────────────────────────────────────────────────────
  protected readonly searchQuery = signal('');
  // Text input changes: debounced
  private readonly textSearch$ = new Subject<{ query: string; filter: FilterOption }>();
  // Filter/clear/open changes: immediate (no debounce)
  private readonly filterChange$ = new Subject<{ query: string; filter: FilterOption }>();
  protected readonly isSearching = signal(false);
  protected readonly searchResults = signal<ListingSearchItem[]>([]);

  // ── Pagination ────────────────────────────────────────────────
  private readonly currentPage = signal(1);
  protected readonly isLoadingMore = signal(false);
  protected readonly hasMore = signal(false);
  private activeQuery = '';

  // ── Filters & sort ────────────────────────────────────────────
  protected readonly activeFilter = signal<FilterOption>('all');
  protected readonly activeSort = signal<SortOption>('title');

  // ── Known source partners (accumulated across fetches) ────────
  private readonly knownSources = signal<string[]>([]);

  // ── Source pills — capped, expandable ────────────────────────
  private readonly MAX_VISIBLE_SOURCES = 4;
  protected readonly sourcePillsExpanded = signal(false);

  // ── Pending selection ─────────────────────────────────────────
  protected readonly pendingId = signal<string | null>(null);
  protected readonly pendingListing = computed(
    () => this.searchResults().find((l) => l.id === this.pendingId()) ?? null,
  );

  // ── Confirmed listing (shown on trigger button) ───────────────
  protected readonly confirmedListing = signal<ListingSearchItem | null>(null);

  // ── Sort only — filtering is handled server-side ──────────────
  protected readonly displayList = computed(() => {
    const list = [...this.searchResults()];
    const sort = this.activeSort();

    if (sort === 'price_asc')
      list.sort((a, b) => (Number(a.price_amount) || 0) - (Number(b.price_amount) || 0));
    else if (sort === 'price_desc')
      list.sort((a, b) => (Number(b.price_amount) || 0) - (Number(a.price_amount) || 0));
    else list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));

    return list;
  });

  protected readonly resultCount = computed(() => this.displayList().length);

  protected readonly allSourcePills = computed(() => this.knownSources());

  protected readonly visibleSourcePills = computed(() => {
    const all = this.allSourcePills();
    return this.sourcePillsExpanded() ? all : all.slice(0, this.MAX_VISIBLE_SOURCES);
  });

  protected readonly hiddenSourceCount = computed(() => {
    const total = this.allSourcePills().length;
    return total > this.MAX_VISIBLE_SOURCES ? total - this.MAX_VISIBLE_SOURCES : 0;
  });

  // ── Filter → API params ───────────────────────────────────────
  private filterToParams(filter: FilterOption): { is_enriched?: boolean; source_partner?: string } {
    if (filter === 'enriched') return { is_enriched: true };
    if (filter === 'not_enriched') return { is_enriched: false };
    if (filter !== 'all') return { source_partner: filter };
    return {};
  }

  // ── Accumulate source pills from any result set ───────────────
  private accumulateSources(items: ListingSearchItem[]): void {
    const newSources = items.map((l) => l.source_partner).filter(Boolean) as string[];
    if (newSources.length > 0) {
      this.knownSources.update((existing) => [...new Set([...existing, ...newSources])]);
    }
  }


  protected shortId(id: string): string {
    return id.slice(0, 8) + '…';
  }

  protected locationLabel(l: ListingSearchItem): string {
    return [l.county, l.district].filter(Boolean).join(', ') || '—';
  }

  protected typeLabel(l: ListingSearchItem): string {
    return [l.property_type, l.typology].filter(Boolean).join(' ') || '—';
  }

  protected titleInitial(title: string | null | undefined): string {
    return (title ?? '?').trim().charAt(0).toUpperCase();
  }

  // ── Load more ─────────────────────────────────────────────────
  protected loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);
    const params = this.filterToParams(this.activeFilter());

    this.realEstateService
      .searchForSelector(this.activeQuery, { page: nextPage, page_size: PAGE_SIZE, ...params })
      .pipe(
        catchError(() => of({ items: [] as ListingSearchItem[], total: 0 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        const newItems = data.items ?? [];
        this.searchResults.update((existing) => [...existing, ...newItems]);
        this.hasMore.set(newItems.length === PAGE_SIZE);
        this.currentPage.set(nextPage);
        this.isLoadingMore.set(false);
        this.accumulateSources(newItems);
      });
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  constructor() {
    // Text search is debounced; filter/clear/open are immediate.
    // Both share the same switchMap so an in-flight request is cancelled
    // whenever either stream emits.
    merge(
      this.textSearch$.pipe(
        debounceTime(280),
        distinctUntilChanged((a, b) => a.query === b.query && a.filter === b.filter),
      ),
      this.filterChange$,
    )
      .pipe(
        switchMap(({ query, filter }) => {
          // Treat 1-char as empty: browse with filter instead of free-text search
          const effectiveQuery = query.trim().length >= 2 ? query.trim() : '';
          this.isSearching.set(true);
          this.activeQuery = effectiveQuery;
          this.currentPage.set(1);
          const params = this.filterToParams(filter);
          return this.realEstateService
            .searchForSelector(effectiveQuery, { page: 1, page_size: PAGE_SIZE, ...params })
            .pipe(catchError(() => of({ items: [] as ListingSearchItem[], total: 0 })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        const items = data.items ?? [];
        this.searchResults.set(items);
        this.hasMore.set(items.length === PAGE_SIZE);
        this.isSearching.set(false);
        this.accumulateSources(items);
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
    if (this.multiMode()) {
      this.selectedItemIds.set([]);
    }
    // Reset text and trigger an immediate browse with current filter
    this.searchQuery.set('');
    this.filterChange$.next({ query: '', filter: this.activeFilter() });
  }

  protected close(): void {
    this.pendingId.set(null);
    this.isOpen.set(false);
  }

  protected confirm(): void {
    if (this.multiMode()) {
      const items = this.selectedItemsList();
      if (items.length === 0) return;
      this.isOpen.set(false);
      this.listingsConfirmed.emit(items);
      return;
    }
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
    this.textSearch$.next({ query, filter: this.activeFilter() });
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.filterChange$.next({ query: '', filter: this.activeFilter() });
  }

  protected selectPending(listing: ListingSearchItem): void {
    if (this.multiMode()) {
      this.selectedItemIds.update((ids) =>
        ids.includes(listing.id) ? ids.filter((id) => id !== listing.id) : [...ids, listing.id],
      );
      return;
    }
    this.pendingId.set(this.pendingId() === listing.id ? null : listing.id);
  }

  protected isItemSelected(id: string): boolean {
    return this.selectedItemIds().includes(id);
  }

  protected setFilter(filter: FilterOption): void {
    this.activeFilter.set(filter);
    // Immediate API call — no debounce — with current query + new filter
    this.filterChange$.next({ query: this.searchQuery(), filter });
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