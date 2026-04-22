import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import type { ListingListRead } from '../../../../core/api/model';
import { ContextMenu } from "../../../../shared/components/context-menu/context-menu";
import { FormatPricePipe } from "../../../../shared/pipes/format-price-pipe";
import { FormatDatePipe } from "../../../../shared/pipes/format-date-pipe";
import { Avatar } from "../../../../shared/components/avatar/avatar";

export type SortField = 'title' | 'price' | 'area' | 'bedrooms' | 'district' | 'created_at';

const AVATAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#06b6d4', '#a855f7', '#ef4444', '#eab308',
];

// Memoization cache: evita recalcular o hash a cada render
const avatarColorCache = new Map<string, string>();

@Component({
  selector: 'app-listings-table',
  templateUrl: './listings-table.html',
  styleUrl: './listings-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContextMenu, FormatPricePipe, FormatDatePipe, Avatar],
})
export class ListingsTableComponent {
  // ── Inputs ────────────────────────────────────────────────────────────────
  realEstates = input.required<ListingListRead[]>();

  // Corrigido: era input<string | null> — perde a segurança de tipo de SortField
  sortField   = input<SortField | null>(null);
  sortOrder   = input<'asc' | 'desc'>('asc');

  // ── Outputs ───────────────────────────────────────────────────────────────
  viewRealEstate   = output<ListingListRead>();
  editRealEstate   = output<ListingListRead>();
  deleteRealEstate = output<string>();
  sort             = output<{ field: SortField; order: 'asc' | 'desc' }>();

  // ── Estado do menu ────────────────────────────────────────────────────────
  // Corrigido: dois signals separados colapsados num só — atualizações atómicas,
  // sem risco de estado intermédio inconsistente (id definido, pos ainda antiga).
  protected readonly menuState = signal<{
    id: string;
    top: number;
    right: number;
  } | null>(null);

  // Computed signals expostos ao template — evitam chamadas de método no @for
  // que seriam reavaliadas em cada ciclo de deteção com OnPush.
  protected readonly openMenuId = computed(() => this.menuState()?.id ?? null);
  protected readonly menuPos    = computed(() => ({
    top:   this.menuState()?.top   ?? 0,
    right: this.menuState()?.right ?? 0,
  }));

  // Computed para indicadores de ordenação — reavaliados só quando sortField/sortOrder mudam
  protected readonly sortIndicators = computed(() => {
    const field = this.sortField();
    const order = this.sortOrder();
    return {
      title:      field === 'title'      ? (order === 'asc' ? '↑' : '↓') : '↕',
      price:      field === 'price'      ? (order === 'asc' ? '↑' : '↓') : '↕',
      district:   field === 'district'   ? (order === 'asc' ? '↑' : '↓') : '↕',
      created_at: field === 'created_at' ? (order === 'asc' ? '↑' : '↓') : '↕',
    };
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  private readonly destroyRef     = inject(DestroyRef);
  private scrollListener: (() => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.removeScrollListener();
      if (this.closeTimer !== null) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
    });
  }

  // ── Ações de linha ────────────────────────────────────────────────────────
  onView(listing: ListingListRead): void {
    this.closeMenu();
    this.viewRealEstate.emit(listing);
  }

  onEdit(listing: ListingListRead): void {
    this.closeMenu();
    this.editRealEstate.emit(listing);
  }

  onDelete(id: string): void {
    this.closeMenu();
    this.deleteRealEstate.emit(id);
  }



  private closeMenu(): void {
    this.menuState.set(null);
    this.removeScrollListener();
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, { capture: true });
      this.scrollListener = null;
    }
  }

  // ── Ordenação ─────────────────────────────────────────────────────────────
  onSort(field: SortField): void {
    const newOrder =
      this.sortField() === field && this.sortOrder() === 'asc' ? 'desc' : 'asc';
    this.sort.emit({ field, order: newOrder });
  }

  // Mantidos como métodos por serem simples derivações de input —
  // o computed sortIndicators já cobre o caso mais pesado (o @for).
  isSortActive(field: SortField): boolean {
    return this.sortField() === field;
  }






}