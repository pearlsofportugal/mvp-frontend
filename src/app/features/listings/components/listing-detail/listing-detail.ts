import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { RealEstate } from '../../../../core/models/listing.model';

@Component({
  selector: 'app-listing-detail',
  imports: [DecimalPipe],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailComponent {
  realEstate = input.required<RealEstate>();
  delete = output<string>();

  onDelete(): void {
    this.delete.emit(this.realEstate().id);
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
    return new Date(date).toLocaleString('pt-PT');
  }

  formatBoolean(value?: boolean): string {
    if (value === true) return '✅';
    if (value === false) return '❌';
    return '-';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.classList.add('error');
  }

  stringifyJSON(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
}
