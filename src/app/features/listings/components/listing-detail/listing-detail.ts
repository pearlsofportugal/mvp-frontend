import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, rxResource, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ImodigiService } from '../../../../core/services/imodigi.service';
import {
  SelectDropdownComponent,
  type SelectOption,
} from '../../../../shared/components/select-dropdown/select-dropdown';
import type {
  ListingDetailRead,
  ImodigiExportResponse,
  ImodigiStoreRead,
} from '../../../../core/api/model';
import { StatusBadge } from "../../../../shared/components/status-badge/status-badge";
import { Spinner } from "../../../../shared/components/spinner/spinner";
import { FormatPricePipe } from "../../../../shared/pipes/format-price-pipe";
import { FormatDatePipe } from "../../../../shared/pipes/format-date-pipe";

@Component({
  selector: 'app-listing-detail',
  imports: [DecimalPipe, ReactiveFormsModule, SelectDropdownComponent, StatusBadge, Spinner, FormatPricePipe, FormatDatePipe],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailComponent {
  realEstate = input.required<ListingDetailRead>();
  delete = output<string>();

  private readonly imodigiService = inject(ImodigiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly exporting = signal(false);
  protected readonly lastExport = signal<ImodigiExportResponse | null>(null);

  // FormControl usado pelo SelectDropdownComponent (CVA) — id da store como string
  protected readonly storeControl = new FormControl<string>('', { nonNullable: true });

  // selectedStoreId reativo derivado do valor do control (number | null para a API)
  private readonly storeValue = toSignal(this.storeControl.valueChanges, { initialValue: '' });
  protected readonly selectedStoreId = computed(() => +this.storeValue() || null);

  readonly storesResource = rxResource<ImodigiStoreRead[], void>({
    stream: () => this.imodigiService.listStores(),
  });

  protected readonly stores = computed(() => this.storesResource.value() ?? []);

  protected readonly storeOptions = computed<SelectOption[]>(() =>
    this.stores().map((s) => ({ value: s.id + '', label: s.name })),
  );

  /**
   * Pure computed: tenta inferir a store id a partir do partner do listing
   */
  readonly inferredStoreId = computed(() => {
    const stores = this.storesResource.value();
    let partner = this.realEstate().source_partner;
    if (!partner) return null;
    if (partner === 'habinedita') partner = 'Habinédita Porto';
    const matched = stores?.find((s) => s.name === partner);
    return matched?.id ?? null;
  });

  // Inicializa storeControl com o inferido apenas se o utilizador não tiver escolhido nada
  constructor() {
    effect(() => {
      const inferred = this.inferredStoreId();
      if (!this.storeControl.value && inferred != null) {
        this.storeControl.setValue(inferred + '');
      }
    });
  }

  onExportToImodigi(): void {
    if (this.exporting()) return;
    this.exporting.set(true);

    this.imodigiService
      .exportListing(this.realEstate().id, this.selectedStoreId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.lastExport.set(res);
          this.exporting.set(false);
        },
        error: () => this.exporting.set(false),
      });
  }

  readonly featureList = computed(() => {
    const r = this.realEstate();
    // No side-effects here — feature list is pure
    return [
      { key: 'has_garage', label: 'Garage', value: r.has_garage },
      { key: 'has_elevator', label: 'Elevator', value: r.has_elevator },
      { key: 'has_balcony', label: 'Balcony', value: r.has_balcony },
      {
        key: 'has_air_conditioning',
        label: 'Air Conditioning',
        value: r.has_air_conditioning,
      },
      { key: 'has_pool', label: 'Pool', value: r.has_pool },
    ].filter((f) => f.value !== null && f.value !== undefined);
  });

  onDelete(): void {
    this.delete.emit(this.realEstate().id);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.classList.add('error');
  }

  stringifyJSON(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
}
