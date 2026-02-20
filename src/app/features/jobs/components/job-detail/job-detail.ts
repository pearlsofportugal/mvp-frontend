import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ScrapeJob } from '../../../../core/models/scrape-job.model';

@Component({
  selector: 'app-job-detail',
  imports: [DatePipe],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailComponent {
  private static readonly DATE_FORMATTER = new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  readonly job = input.required<ScrapeJob>();
  readonly close = output<void>();

  protected readonly progressPercentage = computed<number>(() => {
    const job = this.job();
    const progress = job.progress;
    if (!progress) return 0;

    const pagesVisited = progress.pages_visited ?? 0;
    const listingsFound = progress.listings_found ?? 0;
    const listingsScraped = progress.listings_scraped ?? 0;

    // Fase 1: descoberta (0-30)
    if (listingsFound <= 0) {
      const maxPages = Math.max(1, job.max_pages ?? 10);
      const discover = Math.round((pagesVisited / maxPages) * 30);
      return this.clamp(discover, 0, 30);
    }

    // Fase 2: scraping (30-100)
    const scrapeRatio = listingsScraped / listingsFound;
    const total = Math.round(30 + scrapeRatio * 70);
    return this.clamp(total, 30, 100);
  });

  protected readonly progressPhase = computed<string>(() => {
    const progress = this.job().progress;
    if (!progress) return 'A iniciar...';

    if ((progress.listings_found ?? 0) <= 0) {
      return `A descobrir listings (${progress.pages_visited ?? 0} páginas)`;
    }

    return `A processar ${progress.listings_scraped ?? 0}/${progress.listings_found ?? 0} listings`;
  });

  protected onClose(): void {
    this.close.emit();
  }

  protected formatDate(date: string | undefined): string {
    if (!date) return '-';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '-';

    return JobDetailComponent.DATE_FORMATTER.format(parsed);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}