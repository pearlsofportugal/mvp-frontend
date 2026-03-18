import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { ListingListRead } from '../../../../core/api/model';

@Component({
  selector: 'app-listings-table',
  templateUrl: './listings-table.html',
  styleUrl: './listings-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsTableComponent {
  realEstates = input.required<ListingListRead[]>();
  viewRealEstate = output<ListingListRead>();
  deleteRealEstate = output<string>();

  onView(listing: ListingListRead): void {
    this.viewRealEstate.emit(listing);
  }

  onDelete(id: string): void {
    this.deleteRealEstate.emit(id);
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
    return new Date(date).toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  isCreated(listing: any): boolean {
  return new Date(listing.updated_at).getTime() ===
         new Date(listing.created_at).getTime();
}
}
