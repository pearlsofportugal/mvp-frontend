import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import type { ListingRead } from '../../../../core/api/model';

@Component({
  selector: 'app-listing-detail',
  imports: [DecimalPipe],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailComponent {
  realEstate = input.required<ListingRead>();
  delete = output<string>();

  onDelete(): void {
    this.delete.emit(this.realEstate().id);
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

  formatDate(date?: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-PT');
  }

  formatBoolean(value?: boolean | null): string {
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
