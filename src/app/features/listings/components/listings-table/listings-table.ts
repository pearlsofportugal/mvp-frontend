import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {  RealEstateListItem } from '../../../../core/models/listing.model';

@Component({
  selector: 'app-listings-table',
  templateUrl: './listings-table.html',
  styleUrl: './listings-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsTableComponent {
  realEstates = input.required<RealEstateListItem[]>();
  viewRealEstate = output<RealEstateListItem>();
  deleteRealEstate = output<string>();

  onView(listing: RealEstateListItem): void {
    this.viewRealEstate.emit(listing);
  }

  onDelete(id: string): void {
    this.deleteRealEstate.emit(id);
  }

  formatPrice(amount?: number, currency?: string): string {
    if (amount == null) return '-';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
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
