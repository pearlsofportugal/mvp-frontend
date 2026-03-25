import { ChangeDetectionStrategy, Component, OnDestroy, input, output, signal } from '@angular/core';

import type { ListingListRead } from '../../../../core/api/model';

type SortField = 'title' | 'price' | 'area' | 'bedrooms' | 'district' | 'created_at';

const AVATAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#06b6d4', '#a855f7', '#ef4444', '#eab308',
];

@Component({
  selector: 'app-listings-table',
  templateUrl: './listings-table.html',
  styleUrl: './listings-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsTableComponent implements OnDestroy {
  realEstates = input.required<ListingListRead[]>();
  sortField = input<string | null>(null);
  sortOrder = input<'asc' | 'desc'>('asc');
  viewRealEstate = output<ListingListRead>();
  editRealEstate = output<ListingListRead>();
  deleteRealEstate = output<string>();
  sort = output<{ field: SortField; order: 'asc' | 'desc' }>();

  protected readonly openMenuId = signal<string | null>(null);
  protected readonly menuPos = signal<{ top: number; right: number }>({ top: 0, right: 0 });

  private scrollListener: (() => void) | null = null;

  ngOnDestroy(): void {
    this.removeScrollListener();
  }

  onView(listing: ListingListRead): void {
    this.closeMenu();
    this.viewRealEstate.emit(listing);
  }
  onEdit(listing: ListingListRead):void{
    this.closeMenu();
    this.editRealEstate.emit(listing);
  }
  onDelete(id: string): void {
    this.closeMenu();
    this.deleteRealEstate.emit(id);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.menuPos.set({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    this.openMenuId.set(id);

    this.removeScrollListener();
    this.scrollListener = () => this.closeMenu();
    window.addEventListener('scroll', this.scrollListener, { capture: true });
  }

  closeMenuDelayed(): void {
    setTimeout(() => this.closeMenu(), 120);
  }

  private closeMenu(): void {
    this.openMenuId.set(null);
    this.removeScrollListener();
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, { capture: true });
      this.scrollListener = null;
    }
  }

  onSort(field: SortField): void {
    const currentField = this.sortField();
    const currentOrder = this.sortOrder();
    const newOrder = currentField === field && currentOrder === 'asc' ? 'desc' : 'asc';
    this.sort.emit({ field, order: newOrder });
  }

  getSortIndicator(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortOrder() === 'asc' ? '↑' : '↓';
  }

  isSortActive(field: SortField): boolean {
    return this.sortField() === field;
  }

  getInitial(source: string): string {
    return source.charAt(0).toUpperCase();
  }

  getAvatarColor(source: string): string {
    let hash = 0;
    for (let i = 0; i < source.length; i++) hash = source.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  formatPrice(amount?: string | number | null, currency?: string | null): string {
    if (amount == null) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(num);
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  isCreated(listing: ListingListRead): boolean {
    return new Date(listing.updated_at).getTime() === new Date(listing.created_at).getTime();
  }
}
