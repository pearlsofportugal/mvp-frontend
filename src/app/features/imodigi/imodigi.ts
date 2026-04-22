import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import type { ImodigiStoreRead, ListingSearchItem } from '../../core/api/model';
import { ImodigiService } from '../../core/services/imodigi.service';
import { ListingSelectorComponent } from '../../shared/components/listing-selector/listing-selector';
import { ImodigiPublishFormComponent } from './components/imodigi-publish-form/imodigi-publish-form';
import { SelectDropdownComponent, type SelectOption } from '../../shared/components/select-dropdown/select-dropdown';
import { Spinner } from '../../shared/components/spinner/spinner';

@Component({
  selector: 'app-imodigi',
  imports: [ReactiveFormsModule, SelectDropdownComponent, ListingSelectorComponent, ImodigiPublishFormComponent, Spinner],
  templateUrl: './imodigi.html',
  styleUrl: './imodigi.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImodigiComponent {
  private readonly imodigiService = inject(ImodigiService);

  // ── Store selection ───────────────────────────────────────
  protected readonly storeControl = new FormControl<string>('', { nonNullable: true });
  private readonly storeValue = toSignal(this.storeControl.valueChanges, { initialValue: '' });

  protected readonly storesResource = rxResource({
    stream: () => this.imodigiService.listStores(),
  });

  protected readonly stores = computed<ImodigiStoreRead[]>(() => this.storesResource.value() ?? []);

  protected readonly storeOptions = computed<SelectOption[]>(() =>
    this.stores().map((s) => ({ value: String(s.id), label: s.name }))
  );

  protected readonly selectedStore = computed<ImodigiStoreRead | null>(
    () => this.stores().find((s) => String(s.id) === this.storeValue()) ?? null
  );

  protected readonly selectedClientId = computed<number | null>(() => this.selectedStore()?.id ?? null);

  // ── Listing selection ─────────────────────────────────────
  protected readonly selectedListings = signal<ListingSearchItem[]>([]);
  protected readonly selectedCount = computed(() => this.selectedListings().length);

  protected onListingsConfirmed(listings: ListingSearchItem[]): void {
    this.selectedListings.set(listings);
  }
}
