import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDate',
})
export class FormatDatePipe implements PipeTransform {
  transform(date?: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
    if (!date) return '—';

    const parsed = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(parsed.getTime())) return '—';

    return parsed.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options,
    });
  }
}
