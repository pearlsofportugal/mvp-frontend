import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}
