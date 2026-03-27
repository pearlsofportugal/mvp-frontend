import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import type { ListingListRead } from '../../../../core/api/model';

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
})
export class ListingsTableComponent implements OnDestroy {
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
    // Garante cleanup ao destruir o componente, mesmo que ngOnDestroy não seja chamado
    this.destroyRef.onDestroy(() => {
      this.removeScrollListener();
      if (this.closeTimer !== null) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
    });
  }

  ngOnDestroy(): void {
    // Mantido por compatibilidade e legibilidade — o destroyRef já garante o cleanup
    this.removeScrollListener();
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  // ── Ações de linha ────────────────────────────────────────────────────────
  onView(listing: ListingListRead): void {
    this.closeMenu();
    this.viewRealEstate.emit(listing);
  }

  onEdit(listing: ListingListRead): void {
    this.closeMenu();
    console.log("teste")
    this.editRealEstate.emit(listing);
  }

  onDelete(id: string): void {
    this.closeMenu();
    this.deleteRealEstate.emit(id);
  }

  // ── Menu kebab ────────────────────────────────────────────────────────────
  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    const btn  = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    // Atualização atómica: id e posição num único set
    this.menuState.set({
      id,
      top:   rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });

    this.removeScrollListener();
    this.scrollListener = () => this.closeMenu();
    window.addEventListener('scroll', this.scrollListener, { capture: true, passive: true });
  }

  closeMenuDelayed(): void {
    // Corrigido: setTimeout guardado para poder ser cancelado no destroy
    if (this.closeTimer !== null) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeMenu();
      this.closeTimer = null;
    }, 120);
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

  // ── Formatação ────────────────────────────────────────────────────────────
  getInitial(source: string): string {
    return source.charAt(0).toUpperCase();
  }

  getAvatarColor(source: string): string {
    // Corrigido: resultado memoizado — hash não é recalculado a cada render
    const cached = avatarColorCache.get(source);
    if (cached) return cached;

    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    avatarColorCache.set(source, color);
    return color;
  }

  formatPrice(amount?: string | number | null, currency?: string | null): string {
    if (amount == null) return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style:    'currency',
      currency: currency || 'EUR',
    }).format(num);
  }

  formatDate(date?: string | null): string {
    // Corrigido: aceitava undefined mas não null; e não validava datas inválidas
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-PT', {
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    });
  }
}