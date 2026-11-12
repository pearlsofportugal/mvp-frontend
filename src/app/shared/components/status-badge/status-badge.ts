import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Rótulos em português para os estados do backend (o valor técnico mantém-se nas classes CSS). */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  running: 'Em curso',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  cancelling: 'A cancelar',
};

@Component({
  selector: 'app-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  status = input.required<string>();
  label = input<string>();
  reference = input<string>();
  variant = input<'badge' | 'export'>('badge');

  protected badgeClass = computed(() => {
    if (this.variant() === 'export') {
      return `export-status-badge export-status--${this.status()}`;
    }
    return `badge badge-${this.status()}`;
  });

  protected displayText = computed(() => {
    const s = this.status();
    if (!s) return '';
    return STATUS_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
  });
}
