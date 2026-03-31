import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatPrice',
})
export class FormatPricePipe implements PipeTransform {
  transform(amount?: string | number | null, currency?: string | null): string {
    if (amount == null) return '-';

    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) return '-';

    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(num);
  }
}
