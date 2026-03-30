import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';

import { RealEstateService } from '../../../../core/services/listings.service';
import { Spinner } from "../../../../shared/components/spinner/spinner";
import { FormatPricePipe } from "../../../../shared/pipes/format-price-pipe";

@Component({
  selector: 'app-listings-stats',
  imports: [DecimalPipe, Spinner, FormatPricePipe],
  templateUrl: './listings-stats.html',
  styleUrl: './listings-stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsStatsComponent {
  private readonly realEstateService = inject(RealEstateService);

  sourcePartner = input<string | undefined>();

  // Resource - automatically reacts to sourcePartner changes
  statsResource = rxResource({
    params: () => this.sourcePartner(),
    stream: ({ params }) => this.realEstateService.getListingStats(params),
  });

  // Computed from resource
  stats = computed(() => this.statsResource.value());
  isLoading = computed(() => this.statsResource.isLoading());


  getStatsEntries(obj?: Record<string, number>): Array<[string, number]> {
    if (!obj) return [];
    return Object.entries(obj);
  }
}
