import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import type { ListingDetailRead } from '../../../../core/api/model';

@Component({
  selector: 'app-listing-detail',
  imports: [DecimalPipe],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailComponent {
  realEstate = input.required<ListingDetailRead>();
  delete = output<string>();

  readonly featureList = computed(() => {
    const r = this.realEstate();
    return [
      { key: 'has_garage', label: 'Garage', value: r.has_garage },
      { key: 'has_elevator', label: 'Elevator', value: r.has_elevator },
      { key: 'has_balcony', label: 'Balcony', value: r.has_balcony },
      { key: 'has_air_conditioning', label: 'Air Conditioning', value: r.has_air_conditioning },
      { key: 'has_pool', label: 'Pool', value: r.has_pool },
    ].filter(f => f.value !== null && f.value !== undefined);
  });

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
